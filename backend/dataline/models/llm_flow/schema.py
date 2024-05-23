import abc
from datetime import datetime
from typing import Any, ClassVar, List, Self
from uuid import UUID, uuid4

from langchain_core.pydantic_v1 import BaseModel as BaseModelV1
from langchain_core.pydantic_v1 import SecretStr as SecretStrV1
from pydantic import BaseModel, Field

from dataline.models.llm_flow.enums import QueryResultType
from dataline.models.result.model import ResultModel
from dataline.models.result.schema import ResultCreate, ResultOut
from dataline.repositories.base import AsyncSession
from dataline.repositories.result import ResultRepository


# Need to use pydantic v1 due to langchain
class QueryOptions(BaseModelV1):
    openai_api_key: SecretStrV1
    model_name: str
    secure_data: bool = False


class QueryResultSchema(BaseModel, abc.ABC):
    result_type: ClassVar[QueryResultType]
    created_at: datetime | None = None

    # Used to identify the result
    # This can be used in ResultOut to link results to their parents
    ephemeral_id: UUID = Field(default_factory=uuid4)


class StorableResultMixin(BaseModel, abc.ABC):
    result_id: UUID | None = None

    @abc.abstractmethod
    async def store_result(
        self, session: AsyncSession, result_repo: ResultRepository, message_id: UUID, linked_id: UUID | None = None
    ) -> ResultModel:
        pass

    @classmethod
    @abc.abstractmethod
    def deserialize(cls, result: ResultModel) -> Self:
        pass


class RenderableResultMixin(abc.ABC):
    """
    This mixin is used to serialize the result to be sent to the client.
    It should not depend on the result being stored in the database.
    """

    @abc.abstractmethod
    def serialize_result(self) -> ResultOut:
        """
        Note on linking results: Left up to the developer to include linked_id in the result content if needed.
        """
        raise NotImplementedError


class SQLQueryRunResult(QueryResultSchema, RenderableResultMixin):  # type: ignore[misc]
    result_type: ClassVar[QueryResultType] = QueryResultType.SQL_QUERY_RUN_RESULT
    linked_id: UUID  # Links this result to it's parent query result.

    columns: list[str]
    rows: list[list[Any] | Any]  # type: ignore[misc]
    is_secure: bool = False

    for_chart: bool = False

    def serialize_result(self) -> ResultOut:
        return ResultOut(
            content=self.model_dump(exclude={"ephemeral_id", "linked_id", "created_at"}),
            type=self.result_type.value,
            linked_id=self.linked_id,
            created_at=datetime.now(),
        )


class ChartGenerationResult(QueryResultSchema, StorableResultMixin, RenderableResultMixin):
    result_type: ClassVar[QueryResultType] = QueryResultType.CHART_GENERATION_RESULT
    linked_id: UUID
    chartjs_json: str

    # Implement storage for chart generation results with data
    async def store_result(
        self, session: AsyncSession, result_repo: ResultRepository, message_id: UUID, linked_id: UUID | None = None
    ) -> ResultModel:
        create = ResultCreate(
            content=self.chartjs_json,
            type=self.result_type.value,
            message_id=message_id,
            linked_id=linked_id,
        )
        stored_result = await result_repo.create(session, create)
        self.result_id = stored_result.id
        self.created_at = stored_result.created_at
        return stored_result

    @classmethod
    def deserialize(cls, result: ResultModel) -> Self:
        if not result.linked_id:
            raise ValueError("Attempting to deserialize a chart generation result without a linked_id")

        return cls(
            chartjs_json=result.content, result_id=result.id, linked_id=result.linked_id, created_at=result.created_at
        )

    def serialize_result(self) -> ResultOut:
        return ResultOut(
            content=self.model_dump(exclude={"ephemeral_id", "linked_id", "created_at"}),
            type=self.result_type.value,
            result_id=self.result_id,
            linked_id=self.linked_id,
            created_at=self.created_at,
        )


class SQLQueryStringResultContent(BaseModel):
    sql: str
    for_chart: bool = False


class SQLQueryStringResult(QueryResultSchema, StorableResultMixin, RenderableResultMixin):
    result_type: ClassVar[QueryResultType] = QueryResultType.SQL_QUERY_STRING_RESULT

    sql: str
    for_chart: bool = False

    async def store_result(
        self, session: AsyncSession, result_repo: ResultRepository, message_id: UUID, linked_id: UUID | None = None
    ) -> ResultModel:
        create = ResultCreate(
            content=SQLQueryStringResultContent(sql=self.sql, for_chart=self.for_chart).model_dump_json(),
            type=self.result_type.value,
            message_id=message_id,
            linked_id=linked_id,
        )
        stored_result = await result_repo.create(session, create)
        self.result_id = stored_result.id
        return stored_result

    @classmethod
    def deserialize(cls, result: ResultModel) -> Self:
        content = SQLQueryStringResultContent.model_validate_json(result.content)
        return cls(sql=content.sql, for_chart=content.for_chart, result_id=result.id, created_at=result.created_at)

    def serialize_result(self) -> ResultOut:
        return ResultOut(
            content=self.model_dump(exclude={"ephemeral_id", "created_at"}),
            type=self.result_type.value,
            result_id=self.result_id,
            created_at=self.created_at,
        )


class SelectedTablesResult(QueryResultSchema, StorableResultMixin, RenderableResultMixin):
    result_type: ClassVar[QueryResultType] = QueryResultType.SELECTED_TABLES

    tables: List[str]

    async def store_result(
        self, session: AsyncSession, result_repo: ResultRepository, message_id: UUID, linked_id: UUID | None = None
    ) -> ResultModel:
        create = ResultCreate(
            content=",".join(self.tables),
            type=self.result_type.value,
            message_id=message_id,
        )
        stored_result = await result_repo.create(session, create)
        self.result_id = stored_result.id
        return stored_result

    @classmethod
    def deserialize(cls, result: ResultModel) -> Self:
        return cls(tables=result.content.split(","), result_id=result.id)

    def serialize_result(self: QueryResultSchema) -> ResultOut:
        return ResultOut(content=self.model_dump(exclude={"ephemeral_id"}), type=self.result_type.value)


ResultType = SQLQueryRunResult | SQLQueryStringResult | SelectedTablesResult | ChartGenerationResult
