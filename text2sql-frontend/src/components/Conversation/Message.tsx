import logo from "../../assets/images/logo_md.png";
import { CodeBlock } from "./CodeBlock";
import { IMessageWithResultsOut } from "../Library/types";
import { DynamicTable } from "../Library/DynamicTable";
import { SelectedTablesDisplay } from "../Library/SelectedTablesDisplay";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { useGetAvatar } from "@/hooks";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Message = ({
  initialMessage,
  className = "",
}: {
  initialMessage: IMessageWithResultsOut;
  className?: string;
}) => {
  const [message, setMessage] = useState(initialMessage);
  const { data: avatarUrl } = useGetAvatar();

  function updateData(content: string) {
    // != null, rules out both null and undefined
    if (message.results != null && content != null) {
      // Remove data result from results if any
      const newResults = message.results?.filter(
        (result) => result.type !== "data"
      );

      const updatedMessage = {
        ...message,
        results: [
          ...newResults,
          {
            type: "data",
            content,
            result_id: "1",
          },
        ],
      } as IMessageWithResultsOut;
      setMessage(updatedMessage);
    }
  }

  const updateCode = (code: string) => {
    setMessage({
      ...message,
      results: message.results?.map((result) => {
        if (result.type !== "SQL_QUERY_STRING_RESULT") return result;
        return { ...result, content: code };
      }),
    });
  };

  return (
    <div
      className={classNames(
        message.role === "ai" ? "dark:bg-gray-800/40" : "dark:bg-gray-900",
        "w-full text-gray-800 dark:text-gray-100 bg-gray-50",
        className
      )}
    >
      <div className="flex p-4 gap-4 text-base md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl md:py-6 lg:px-0 m-auto">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className="">
            <div className="relative p-1 rounded-sm text-white flex items-center justify-center">
              {message.role === "ai" ? (
                <img src={logo} className="h-7 w-7" />
              ) : avatarUrl ? (
                <img
                  className="h-7 w-7 rounded-sm bg-gray-800"
                  src={avatarUrl}
                  alt=""
                />
              ) : (
                <UserCircleIcon className="text-gray-300 h-8 w-8 rounded-full " />
              )}
            </div>
          </div>
        </div>
        <div className="flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)] scrollbar-hide">
          {message.content && (
            <div className="flex flex-grow flex-col gap-3">
              <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap break-words">
                <div className="markdown prose w-full break-words dark:prose-invert dark">
                  <p>{message.content}</p>
                </div>
              </div>
            </div>
          )}

          {/** RESULTS: QUERY, DATA, PLOTS */}
          {/** Sort results as selected_tables first, data second, code third using tertiary if **/}
          {message.results
            ?.sort((a, b) => {
              if (a.type === "SELECTED_TABLES") return -1;
              if (b.type === "SELECTED_TABLES") return 1;
              if (a.type === "data") return -1;
              if (b.type === "data") return 1;
              if (a.type === "SQL_QUERY_STRING_RESULT") return -1;
              if (b.type === "SQL_QUERY_STRING_RESULT") return 1;
              return 0;
            })
            .map(
              (result, index) =>
                (result.type === "SELECTED_TABLES" && (
                  <SelectedTablesDisplay
                    tables={result.content as string}
                    key={`message-${message.id}-selectedtables-${index}`}
                  />
                )) ||
                (result.type === "data" && (
                  <DynamicTable
                    key={`message-${message.id}-table-${index}`}
                    data={result.content}
                  />
                )) ||
                (result.type === "SQL_QUERY_STRING_RESULT" && (
                  <CodeBlock
                    key={`message-${message.id}-code-${index}`}
                    language="SQL_QUERY_STRING_RESULT"
                    code={result.content as string}
                    resultId={result.result_id}
                    updateMessage={updateData}
                    updateCode={updateCode}
                  />
                ))
            )}

          <div className="flex justify-between lg:block">
            <div className="text-xs flex items-center justify-center gap-1 self-center pt-2 !invisible">
              <button
                disabled={false}
                className="dark:text-white disabled:text-gray-300 dark:disabled:text-gray-400"
              >
                <svg
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <span className="flex-grow flex-shrink-0">1 / 1</span>
              <button
                disabled={false}
                className="dark:text-white disabled:text-gray-300 dark:disabled:text-gray-400"
              >
                <svg
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
