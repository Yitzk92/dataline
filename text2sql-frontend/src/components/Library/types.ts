// Enum for sql dialects
export enum Dialect {
  Postgres = "postgresql",
  MySQL = "mysql",
  SQLite = "sqlite",
  MariaDB = "mariadb",
  Spark = "spark",
  BigQuery = "bigquery",
  IBMDB2 = "db2",
  Hive = "hive",
  Couchbase = "n1ql",
  TransactSQL = "tsql",
}

export type IResultType =
  | "SQL_QUERY_STRING_RESULT"
  | "code"
  | "data"
  | "text"
  | "SELECTED_TABLES";
export type Role = "ai" | "human";

export interface IResult {
  type: IResultType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: string | any[][];
  result_id?: string;
  is_saved?: boolean;
}

export interface IMessageOut {
  id: string;
  content: string;
  role: Role;
  created_at?: string;
}

export interface IMessageWithResultsOut extends IMessageOut {
  results?: IResult[];
}
export interface IConversationWithMessagesWithResultsOut {
  id: string;
  connection_id: string;
  name: string;
  messages: IMessageWithResultsOut[];
}

export interface IConversation {
  id: string;
  name: string;
}

export interface IConnection {
  id: string;
  name: string;
  dsn: string;
  dialect: string;
  is_sample: boolean;
}

export interface IEditConnection {
  name: string;
  dsn: string;
}
