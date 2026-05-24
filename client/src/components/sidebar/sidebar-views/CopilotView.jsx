import { useCopilot } from "@/context/CopilotContext"
import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { SocketEvent } from "@/types/socket"
import toast from "react-hot-toast"
import { LuClipboardPaste, LuCopy, LuRepeat } from "react-icons/lu"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

function CopilotView() {
    const {socket} = useSocket()
    const { viewHeight } = useResponsive()
    const { generateCode, output, isRunning, setInput } = useCopilot()
    const { activeFile, updateFileContent, setActiveFile } = useFileSystem()

    const copyOutput = async () => {
        try {
            const content = output.replace(/```[\w]*\n?/g, "").trim()
            await navigator.clipboard.writeText(content)
            toast.success("Output copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy output to clipboard")
            console.log(error)
        }
    }

    const pasteCodeInFile = () => {
        if (activeFile) {
            const fileContent = activeFile.content
                ? `${activeFile.content}\n`
                : ""
            const content = `${fileContent}${output.replace(/```[\w]*\n?/g, "").trim()}`
            updateFileContent(activeFile.id, content)
            // Update the content of the active file if it's the same file
            setActiveFile({ ...activeFile, content })
            toast.success("Code pasted successfully")
            // Emit the FILE_UPDATED event to the server
            socket.emit(SocketEvent.FILE_UPDATED, {
                fileId: activeFile.id,
                newContent: content,
            })
        }
    }

    const replaceCodeInFile = () => {
        if (activeFile) {
            const isConfirmed = confirm(
                `Are you sure you want to replace the code in the file?`,
            )
            if (!isConfirmed) return
            const content = output.replace(/```[\w]*\n?/g, "").trim()
            updateFileContent(activeFile.id, content)
            // Update the content of the active file if it's the same file
            setActiveFile({ ...activeFile, content })
            toast.success("Code replaced successfully")
            // Emit the FILE_UPDATED event to the server
            socket.emit(SocketEvent.FILE_UPDATED, {
                fileId: activeFile.id,
                newContent: content,
            })
        }
    }

    return (
        <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
            <div className="text-xs font-semibold text-textTertiary uppercase tracking-wider mb-1">
                AI Assistant
            </div>
            <textarea
                className="w-full min-h-[100px] rounded border border-colorBorderSecondary bg-colorBackgroundPrimary p-3 text-xs text-textPrimary outline-none focus:border-[#534ab7b3] transition-colors resize-none"
                placeholder="Ask Copilot to generate or explain code..."
                onChange={(e) => setInput(e.target.value)}
            />
            <button
                className="flex w-full items-center justify-center rounded bg-[#534AB7] py-2 text-xs font-medium text-[#EEEDFE] hover:bg-[#4338ca] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={generateCode}
                disabled={isRunning}
            >
                {isRunning ? "Generating..." : "Generate Code"}
            </button>

            {output && (
                <div className="flex flex-col gap-2 flex-grow overflow-hidden mt-2">
                    <div className="flex items-center justify-between border-b border-colorBorderTertiary pb-2">
                        <span className="ai-badge">AI Response</span>
                        <div className="flex items-center gap-2">
                            <button
                                className="flex items-center justify-center p-1.5 rounded hover:bg-colorBackgroundPrimary text-textSecondary hover:text-textPrimary"
                                title="Copy Output"
                                onClick={copyOutput}
                            >
                                <LuCopy size={14} />
                            </button>
                            <button
                                className="flex items-center justify-center p-1.5 rounded hover:bg-colorBackgroundPrimary text-textSecondary hover:text-textPrimary"
                                title="Replace code in file"
                                onClick={replaceCodeInFile}
                            >
                                <LuRepeat size={14} />
                            </button>
                            <button
                                className="flex items-center justify-center p-1.5 rounded hover:bg-colorBackgroundPrimary text-textSecondary hover:text-textPrimary"
                                title="Paste code in file"
                                onClick={pasteCodeInFile}
                            >
                                <LuClipboardPaste size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 text-xs text-textSecondary leading-relaxed">
                        <ReactMarkdown
                            components={{
                                code({ inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || "")
                                    const language = match ? match[1] : "javascript"

                                    return !inline ? (
                                        <SyntaxHighlighter
                                            style={dracula}
                                            language={language}
                                            PreTag="pre"
                                            className="!m-0 !mt-2 !mb-2 !rounded !bg-colorBackgroundPrimary !p-3 border border-colorBorderTertiary"
                                        >
                                            {String(children).replace(/\n$/, "")}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <code className="bg-colorBackgroundPrimary border border-colorBorderTertiary px-1 py-0.5 rounded text-red-400 font-mono text-[10px]" {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {output}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CopilotView
