import { useRunCode } from "@/context/RunCodeContext"
import toast from "react-hot-toast"
import { LuCopy, LuPlay } from "react-icons/lu"
import { PiCaretDownBold } from "react-icons/pi"

function RunView() {
    const {
        setInput,
        output,
        isRunning,
        supportedLanguages,
        selectedLanguage,
        setSelectedLanguage,
        runCode,
    } = useRunCode()

    const handleLanguageChange = (e) => {
        const lang = JSON.parse(e.target.value)
        setSelectedLanguage(lang)
    }

    const copyOutput = () => {
        navigator.clipboard.writeText(output)
        toast.success("Output copied to clipboard")
    }

    return (
        <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
            <div className="text-xs font-semibold text-textTertiary uppercase tracking-wider mb-1">
                Execution Settings & Console
            </div>

            {/* Language Selector */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-textSecondary font-semibold uppercase tracking-wider">
                    Runtime Language
                </label>
                <div className="relative w-full">
                    <select
                        className="w-full rounded border border-colorBorderSecondary bg-colorBackgroundPrimary px-3 py-2 text-xs text-textPrimary outline-none focus:border-[#534ab7b3] transition-colors appearance-none cursor-pointer"
                        value={JSON.stringify(selectedLanguage)}
                        onChange={handleLanguageChange}
                    >
                        {supportedLanguages
                            .sort((a, b) => (a.language > b.language ? 1 : -1))
                            .map((lang, i) => {
                                return (
                                    <option
                                        key={i}
                                        value={JSON.stringify(lang)}
                                        className="bg-[#13151a] text-white"
                                    >
                                        {lang.language +
                                            (lang.version
                                                ? ` (${lang.version})`
                                                : "")}
                                    </option>
                                )
                            })}
                    </select>
                    <PiCaretDownBold
                        size={12}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-textSecondary pointer-events-none"
                    />
                </div>
            </div>

            {/* Standard Input */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-textSecondary font-semibold uppercase tracking-wider">
                    Stdin Input (Optional)
                </label>
                <textarea
                    className="w-full min-h-[60px] max-h-[100px] rounded border border-colorBorderSecondary bg-colorBackgroundPrimary p-3 text-xs text-textPrimary outline-none focus:border-[#534ab7b3] transition-colors resize-none"
                    placeholder="Enter standard input for execution..."
                    onChange={(e) => setInput(e.target.value)}
                />
            </div>

            {/* Run Action */}
            <button
                className="flex w-full items-center justify-center gap-1.5 rounded bg-[#534AB7] py-2 text-xs font-medium text-[#EEEDFE] hover:bg-[#4338ca] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={runCode}
                disabled={isRunning}
            >
                <LuPlay size={13} />
                <span>{isRunning ? "Running..." : "Run Code"}</span>
            </button>

            {/* Output terminal */}
            <div className="flex-1 flex flex-col gap-1.5 overflow-hidden min-h-[120px]">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-textSecondary font-semibold uppercase tracking-wider">
                        Stdout / Stderr
                    </span>
                    {output && (
                        <button
                            className="flex items-center justify-center p-1 rounded hover:bg-colorBackgroundPrimary text-textSecondary hover:text-textPrimary transition-colors"
                            onClick={copyOutput}
                            title="Copy Output"
                        >
                            <LuCopy size={13} />
                        </button>
                    )}
                </div>
                <div className="flex-1 w-full overflow-y-auto rounded border border-colorBorderTertiary bg-[#0C0C0E] p-3 font-mono text-[11px] text-emerald-400 select-text leading-relaxed">
                    {output ? (
                        <pre className="whitespace-pre-wrap">{output}</pre>
                    ) : (
                        <span className="text-textTertiary italic">
                            Run code to see stdout output here...
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RunView
