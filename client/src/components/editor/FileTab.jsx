import { useFileSystem } from "@/context/FileContext"
import { getIconClassName } from "@/utils/getIconClassName"
import { Icon } from "@iconify/react"
import { IoClose } from "react-icons/io5"
import cn from "classnames"
import { useEffect, useRef } from "react"
import customMapping from "@/utils/customMapping"
import { useSettings } from "@/context/SettingContext"
import langMap from "lang-map"

function FileTab() {
    const {
        openFiles,
        closeFile,
        activeFile,
        updateFileContent,
        setActiveFile,
    } = useFileSystem()
    const fileTabRef = useRef(null)
    const { setLanguage } = useSettings()

    const changeActiveFile = (fileId) => {
        // If the file is already active, do nothing
        if (activeFile?.id === fileId) return

        updateFileContent(activeFile?.id || "", activeFile?.content || "")

        const file = openFiles.find((file) => file.id === fileId)
        if (file) {
            setActiveFile(file)
        }
    }

    useEffect(() => {
        const fileTabNode = fileTabRef.current
        if (!fileTabNode) return

        const handleWheel = (e) => {
            if (e.deltaY > 0) {
                fileTabNode.scrollLeft += 100
            } else {
                fileTabNode.scrollLeft -= 100
            }
        }

        fileTabNode.addEventListener("wheel", handleWheel)

        return () => {
            fileTabNode.removeEventListener("wheel", handleWheel)
        }
    }, [])

    // Update the editor language when a file is opened
    useEffect(() => {
        if (activeFile?.name === undefined) return
        // Get file extension on file open and set language when file is opened
        const extension = activeFile.name.split(".").pop()
        if (!extension) return

        // Check if custom mapping exists
        if (customMapping[extension]) {
            setLanguage(customMapping[extension])
            return
        }

        const language = langMap.languages(extension)
        setLanguage(language[0])
    }, [activeFile?.name, setLanguage])

    return (
        <div
            className="tab-bar"
            ref={fileTabRef}
        >
            {openFiles.map((file) => (
                <div
                    key={file.id}
                    className={cn(
                        "tab",
                        { "active": file.id === activeFile?.id },
                    )}
                    onClick={() => changeActiveFile(file.id)}
                >
                    <Icon
                        icon={getIconClassName(file.name)}
                        fontSize={14}
                        className="min-w-fit"
                    />
                    <span
                        className="truncate"
                        title={file.name}
                    >
                        {file.name}
                    </span>
                    <button
                        className="tab-close"
                        onClick={(e) => {
                            e.stopPropagation()
                            closeFile(file.id)
                        }}
                    >
                        <IoClose size={12} />
                    </button>
                </div>
            ))}
        </div>
    )
}

export default FileTab
