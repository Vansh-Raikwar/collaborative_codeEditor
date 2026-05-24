import { useFileSystem } from "@/context/FileContext"
import cn from "classnames"
import Editor from "./Editor"
import FileTab from "./FileTab"

function EditorComponent() {
    const { openFiles } = useFileSystem()

    if (openFiles.length <= 0) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-colorBackgroundPrimary">
                <h1 className="text-sm text-textTertiary font-medium">
                    No file is currently open.
                </h1>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-colorBackgroundPrimary">
            <FileTab />
            <div className="flex-1 overflow-hidden relative">
                <Editor />
            </div>
        </div>
    )
}

export default EditorComponent
