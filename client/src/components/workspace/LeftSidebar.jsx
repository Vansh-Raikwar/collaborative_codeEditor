import { useState, useRef, useEffect } from "react"
import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useViews } from "@/context/ViewContext"
import { useContextMenu } from "@/hooks/useContextMenu"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { ACTIVITY_STATE } from "@/types/app"
import { sortFileSystemItem } from "@/utils/file"
import { getIconClassName } from "@/utils/getIconClassName"
import { Icon } from "@iconify/react"
import cn from "classnames"
import { AiOutlineFolder, AiOutlineFolderOpen } from "react-icons/ai"
import { IoClose } from "react-icons/io5"
import { MdDelete } from "react-icons/md"
import { PiPencilSimpleFill } from "react-icons/pi"
import {
    RiFileAddLine,
    RiFolderAddLine,
    RiFolderUploadLine,
} from "react-icons/ri"
import { TbFileUpload } from "react-icons/tb"
import { BiArchiveIn } from "react-icons/bi"
import { v4 as uuidV4 } from "uuid"
import { toast } from "react-hot-toast"
import RenameView from "@/components/files/RenameView"

const collabColors = ["#CECBF6", "#9FE1CB", "#F5C4B3", "#B5D4F4"]

function LeftSidebar({ isOpen, onClose }) {
    const {
        fileStructure,
        createFile,
        createDirectory,
        collapseDirectories,
        downloadFilesAndFolders,
        updateDirectory,
    } = useFileSystem()
    const { users, currentUser, activityState, setActivityState } = useAppContext()
    const explorerRef = useRef(null)
    const inputRef = useRef(null)
    const [selectedDirId, setSelectedDirId] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(null)
    const [inputValue, setInputValue] = useState("")

    useEffect(() => {
        if (modalOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [modalOpen])

    const handleClickOutside = (e) => {
        if (
            explorerRef.current &&
            !explorerRef.current.contains(e.target)
        ) {
            setSelectedDirId(fileStructure.id)
        }
    }

    const handleCreateFile = (e) => {
        e.stopPropagation()
        setModalOpen("file")
        setInputValue("")
    }

    const handleCreateDirectory = (e) => {
        e.stopPropagation()
        setModalOpen("directory")
        setInputValue("")
    }

    const handleConfirmCreate = (e) => {
        if (e) e.preventDefault()
        const trimmed = inputValue.trim()
        if (!trimmed) return

        const parentDirId = selectedDirId || fileStructure.id
        if (modalOpen === "file") {
            createFile(parentDirId, trimmed)
        } else {
            createDirectory(parentDirId, trimmed)
        }
        setModalOpen(null)
    }

    const handleOpenDirectory = async () => {
        try {
            setIsLoading(true)

            if ("showDirectoryPicker" in window) {
                const directoryHandle = await window.showDirectoryPicker()
                await processDirectoryHandle(directoryHandle)
                return
            }

            if ("webkitdirectory" in HTMLInputElement.prototype) {
                const fileInput = document.createElement("input")
                fileInput.type = "file"
                fileInput.webkitdirectory = true

                fileInput.onchange = async (e) => {
                    const files = e.target.files
                    if (files) {
                        const structure = await readFileList(files)
                        updateDirectory("", structure)
                    }
                }

                fileInput.click()
                return
            }

            toast.error("Your browser does not support directory selection.")
        } catch (error) {
            console.error("Error opening directory:", error)
            toast.error("Failed to open directory")
        } finally {
            setIsLoading(false)
        }
    }

    const processDirectoryHandle = async (
        directoryHandle
    ) => {
        try {
            toast.loading("Getting files and folders...")
            const structure = await readDirectory(directoryHandle)
            updateDirectory("", structure)
            toast.dismiss()
            toast.success("Directory loaded successfully")
        } catch (error) {
            console.error("Error processing directory:", error)
            toast.error("Failed to process directory")
        }
    }

    const readDirectory = async (
        directoryHandle
    ) => {
        const children = []
        const blackList = ["node_modules", ".git", ".vscode", ".next"]

        for await (const entry of directoryHandle.values()) {
            if (entry.kind === "file") {
                const file = await entry.getFile()
                const newFile = {
                    id: uuidV4(),
                    name: entry.name,
                    type: "file",
                    content: await readFileContent(file),
                }
                children.push(newFile)
            } else if (entry.kind === "directory") {
                if (blackList.includes(entry.name)) continue

                const newDirectory = {
                    id: uuidV4(),
                    name: entry.name,
                    type: "directory",
                    children: await readDirectory(entry),
                    isOpen: false,
                }
                children.push(newDirectory)
            }
        }
        return children
    }

    const readFileList = async (files) => {
        const children = []
        const blackList = ["node_modules", ".git", ".vscode", ".next"]

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const pathParts = file.webkitRelativePath.split("/")

            if (pathParts.some((part) => blackList.includes(part))) continue

            if (pathParts.length > 1) {
                const directoryPath = pathParts.slice(0, -1).join("/")
                const directoryIndex = children.findIndex(
                    (item) =>
                        item.name === directoryPath && item.type === "directory"
                )

                if (directoryIndex === -1) {
                    const newDirectory = {
                        id: uuidV4(),
                        name: directoryPath,
                        type: "directory",
                        children: [],
                        isOpen: false,
                    }
                    children.push(newDirectory)
                }

                const newFile = {
                    id: uuidV4(),
                    name: file.name,
                    type: "file",
                    content: await readFileContent(file),
                }

                const targetDirectory = children.find(
                    (item) =>
                        item.name === directoryPath && item.type === "directory"
                )
                if (targetDirectory && targetDirectory.children) {
                    targetDirectory.children.push(newFile)
                }
            } else {
                const newFile = {
                    id: uuidV4(),
                    name: file.name,
                    type: "file",
                    content: await readFileContent(file),
                }
                children.push(newFile)
            }
        }
        return children
    }

    const readFileContent = async (file) => {
        const MAX_FILE_SIZE = 1024 * 1024 // 1MB limit

        if (file.size > MAX_FILE_SIZE) {
            return `File too large: ${file.name} (${Math.round(
                file.size / 1024
            )}KB)`
        }

        try {
            return await file.text()
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error)
            return `Error reading file: ${file.name}`
        }
    }

    const sortedFileStructure = sortFileSystemItem(fileStructure)
    const remoteUsers = users.filter((u) => u.username !== currentUser?.username)

    return (
        <aside className={cn("sidebar select-none", { open: isOpen })} onClick={handleClickOutside}>
            <div className="sidebar-section" ref={explorerRef}>
                <div className="sidebar-label">
                    <div className="flex items-center gap-2">
                        <button
                            className="mobile-close-btn"
                            onClick={onClose}
                            title="Close Sidebar"
                            aria-label="Close Sidebar"
                        >
                            <IoClose size={16} />
                        </button>
                        <span>Explorer</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="rounded p-0.5 hover:bg-darkHover text-textSecondary hover:text-textPrimary"
                            onClick={handleCreateFile}
                            title="Create File"
                        >
                            <RiFileAddLine size={15} />
                        </button>
                        <button
                            className="rounded p-0.5 hover:bg-darkHover text-textSecondary hover:text-textPrimary"
                            onClick={handleCreateDirectory}
                            title="Create Directory"
                        >
                            <RiFolderAddLine size={15} />
                        </button>
                        <button
                            className="rounded p-0.5 hover:bg-darkHover text-textSecondary hover:text-textPrimary"
                            onClick={(e) => {
                                e.stopPropagation()
                                collapseDirectories()
                            }}
                            title="Collapse All Directories"
                        >
                            <RiFolderUploadLine size={15} />
                        </button>
                    </div>
                </div>

                <div className="file-tree pr-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                    {sortedFileStructure.children &&
                        sortedFileStructure.children.map((item) => (
                            <Directory
                                key={item.id}
                                item={item}
                                setSelectedDirId={setSelectedDirId}
                            />
                        ))}
                </div>

                {/* Open/Upload & Download buttons at the bottom of Explorer */}
                <div className="mt-4 flex flex-col gap-1.5 border-t border-colorBorderTertiary pt-4">
                    <button
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-textSecondary hover:text-textPrimary hover:bg-colorBackgroundTertiary transition-colors"
                        onClick={handleOpenDirectory}
                        disabled={isLoading}
                    >
                        <TbFileUpload size={16} />
                        <span>{isLoading ? "Loading..." : "Open Folder"}</span>
                    </button>
                    <button
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-textSecondary hover:text-textPrimary hover:bg-colorBackgroundTertiary transition-colors"
                        onClick={downloadFilesAndFolders}
                    >
                        <BiArchiveIn size={16} />
                        <span>Download Code</span>
                    </button>
                </div>
            </div>

            {/* Collaborators section at the bottom */}
            <div className="collab-section">
                <div className="sidebar-label">Collaborators</div>
                <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1">
                    {currentUser && (
                        <div className="collab-user">
                            <span
                                className="collab-dot"
                                style={{
                                    backgroundColor: collabColors[0],
                                    boxShadow: `0 0 6px ${collabColors[0]}`,
                                }}
                            ></span>
                            <div>
                                <div className="collab-name">
                                    {currentUser.username} (You)
                                </div>
                                <div className="collab-file text-[9px] text-textTertiary">
                                    {activityState === ACTIVITY_STATE.DRAWING
                                        ? "drawing"
                                        : "editing code"}
                                </div>
                            </div>
                        </div>
                    )}
                    {remoteUsers.map((u, i) => {
                        const dotColor = collabColors[(i + 1) % collabColors.length]
                        return (
                            <div key={u.socketId} className="collab-user">
                                <span
                                    className="collab-dot"
                                    style={{
                                        backgroundColor: dotColor,
                                        boxShadow: `0 0 6px ${dotColor}`,
                                    }}
                                ></span>
                                <div>
                                    <div className="collab-name">{u.username}</div>
                                    <div className="collab-file text-[9px] text-textTertiary">
                                        {u.typing ? "typing..." : "viewing code"}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            {/* Modal Backdrop & Dialog */}
            {modalOpen && (
                <div 
                    className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-xs"
                    onClick={() => setModalOpen(null)}
                >
                    <form 
                        className="bg-colorBackgroundSecondary border border-colorBorderSecondary p-5 rounded shadow-2xl w-[300px] flex flex-col gap-3.5"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleConfirmCreate}
                    >
                        <div className="text-xs font-semibold text-textPrimary uppercase tracking-wider">
                            Create New {modalOpen === "file" ? "File" : "Folder"}
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full rounded border border-colorBorderSecondary bg-white px-3 py-2 text-xs text-black outline-none focus:border-[#534ab7b3] transition-colors"
                            placeholder={modalOpen === "file" ? "e.g. index.js" : "e.g. components"}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 text-xs">
                            <button
                                type="button"
                                className="px-3 py-1.5 rounded hover:bg-colorBackgroundPrimary text-textSecondary transition-colors"
                                onClick={() => setModalOpen(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-3 py-1.5 rounded bg-[#534AB7] text-[#EEEDFE] hover:bg-[#4338ca] transition-colors font-medium"
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </aside>
    )
}

function Directory({
    item,
    setSelectedDirId,
}) {
    const [isEditing, setEditing] = useState(false)
    const dirRef = useRef(null)
    const { coords, menuOpen, setMenuOpen } = useContextMenu({
        ref: dirRef,
    })
    const { deleteDirectory, toggleDirectory } = useFileSystem()

    const handleDirClick = (dirId) => {
        setSelectedDirId(dirId)
        toggleDirectory(dirId)
    }

    const handleRenameDirectory = (e) => {
        e.stopPropagation()
        setMenuOpen(false)
        setEditing(true)
    }

    const handleDeleteDirectory = (e, id) => {
        e.stopPropagation()
        setMenuOpen(false)
        const isConfirmed = confirm(
            `Are you sure you want to delete directory?`
        )
        if (isConfirmed) {
            deleteDirectory(id)
        }
    }

    useEffect(() => {
        const dirNode = dirRef.current
        if (!dirNode) return
        dirNode.tabIndex = 0

        const handleF2 = (e) => {
            e.stopPropagation()
            if (e.key === "F2") {
                setEditing(true)
            }
        }

        dirNode.addEventListener("keydown", handleF2)
        return () => {
            dirNode.removeEventListener("keydown", handleF2)
        }
    }, [])

    if (item.type === "file") {
        return <File item={item} setSelectedDirId={setSelectedDirId} />
    }

    return (
        <div>
            <div
                className="folder-item"
                onClick={() => handleDirClick(item.id)}
                ref={dirRef}
            >
                {item.isOpen ? (
                    <AiOutlineFolderOpen size={16} className="text-textSecondary" />
                ) : (
                    <AiOutlineFolder size={16} className="text-textSecondary" />
                )}
                {isEditing ? (
                    <RenameView
                        id={item.id}
                        preName={item.name}
                        type="directory"
                        setEditing={setEditing}
                    />
                ) : (
                    <span className="truncate flex-1" title={item.name}>
                        {item.name}
                    </span>
                )}
            </div>
            <div
                className={cn(
                    { hidden: !item.isOpen },
                    { block: item.isOpen },
                    { "folder-children": item.name !== "root" }
                )}
            >
                {item.children &&
                    item.children.map((item) => (
                        <Directory
                            key={item.id}
                            item={item}
                            setSelectedDirId={setSelectedDirId}
                        />
                    ))}
            </div>

            {menuOpen && (
                <DirectoryMenu
                    handleDeleteDirectory={handleDeleteDirectory}
                    handleRenameDirectory={handleRenameDirectory}
                    id={item.id}
                    left={coords.x}
                    top={coords.y}
                />
            )}
        </div>
    )
}

const File = ({
    item,
    setSelectedDirId,
}) => {
    const { deleteFile, openFile, activeFile } = useFileSystem()
    const [isEditing, setEditing] = useState(false)
    const { setIsSidebarOpen } = useViews()
    const { isMobile } = useWindowDimensions()
    const { activityState, setActivityState } = useAppContext()
    const fileRef = useRef(null)
    const { menuOpen, coords, setMenuOpen } = useContextMenu({
        ref: fileRef,
    })

    const handleFileClick = (fileId) => {
        if (isEditing) return
        setSelectedDirId(fileId)
        openFile(fileId)

        if (isMobile) {
            setIsSidebarOpen(false)
        }
        if (activityState === ACTIVITY_STATE.DRAWING) {
            setActivityState(ACTIVITY_STATE.CODING)
        }
    }

    const handleRenameFile = (e) => {
        e.stopPropagation()
        setEditing(true)
        setMenuOpen(false)
    }

    const handleDeleteFile = (e, id) => {
        e.stopPropagation()
        setMenuOpen(false)
        const isConfirmed = confirm(`Are you sure you want to delete file?`)
        if (isConfirmed) {
            deleteFile(id)
        }
    }

    useEffect(() => {
        const fileNode = fileRef.current
        if (!fileNode) return
        fileNode.tabIndex = 0

        const handleF2 = (e) => {
            e.stopPropagation()
            if (e.key === "F2") {
                setEditing(true)
            }
        }

        fileNode.addEventListener("keydown", handleF2)
        return () => {
            fileNode.removeEventListener("keydown", handleF2)
        }
    }, [])

    const isActive = activeFile?.id === item.id && activityState === ACTIVITY_STATE.CODING

    return (
        <div
            className={cn("file-item", { active: isActive })}
            onClick={() => handleFileClick(item.id)}
            ref={fileRef}
        >
            <Icon
                icon={getIconClassName(item.name)}
                fontSize={16}
                className="min-w-fit"
            />
            {isEditing ? (
                <RenameView
                    id={item.id}
                    preName={item.name}
                    type="file"
                    setEditing={setEditing}
                />
            ) : (
                <span className="truncate flex-1" title={item.name}>
                    {item.name}
                </span>
            )}

            {menuOpen && (
                <FileMenu
                    top={coords.y}
                    left={coords.x}
                    id={item.id}
                    handleRenameFile={handleRenameFile}
                    handleDeleteFile={handleDeleteFile}
                />
            )}
        </div>
    )
}

const FileMenu = ({
    top,
    left,
    id,
    handleRenameFile,
    handleDeleteFile,
}) => {
    return (
        <div
            className="fixed z-[1000] w-[130px] rounded border border-colorBorderSecondary bg-colorBackgroundTertiary p-1 shadow-lg"
            style={{
                top,
                left,
            }}
        >
            <button
                onClick={handleRenameFile}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-textSecondary hover:text-textPrimary hover:bg-colorBackgroundSecondary"
            >
                <PiPencilSimpleFill size={14} />
                Rename
            </button>
            <button
                onClick={(e) => handleDeleteFile(e, id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-colorBackgroundSecondary"
            >
                <MdDelete size={14} />
                Delete
            </button>
        </div>
    )
}

const DirectoryMenu = ({
    top,
    left,
    id,
    handleRenameDirectory,
    handleDeleteDirectory,
}) => {
    return (
        <div
            className="fixed z-[1000] w-[130px] rounded border border-colorBorderSecondary bg-colorBackgroundTertiary p-1 shadow-lg"
            style={{
                top,
                left,
            }}
        >
            <button
                onClick={handleRenameDirectory}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-textSecondary hover:text-textPrimary hover:bg-colorBackgroundSecondary"
            >
                <PiPencilSimpleFill size={14} />
                Rename
            </button>
            <button
                onClick={(e) => handleDeleteDirectory(e, id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-colorBackgroundSecondary"
            >
                <MdDelete size={14} />
                Delete
            </button>
        </div>
    )
}

export default LeftSidebar
