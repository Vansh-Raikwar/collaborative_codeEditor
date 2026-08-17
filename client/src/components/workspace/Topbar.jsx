import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import { ACTIVITY_STATE } from "@/types/app"
import { SocketEvent } from "@/types/socket"
import toast from "react-hot-toast"
import { IoCodeSlash } from "react-icons/io5"
import { LuUserPlus } from "react-icons/lu"
import { MdOutlineDraw } from "react-icons/md"
import { HiOutlineMenuAlt2 } from "react-icons/hi"
import { PiChatCircleDots } from "react-icons/pi"

function Topbar({ onToggleSidebar, onToggleRightPanel }) {
    const { users, activityState, setActivityState } = useAppContext()
    const { activeFile, fileStructure } = useFileSystem()
    const { socket } = useSocket()

    const toggleMode = () => {
        if (activityState === ACTIVITY_STATE.CODING) {
            setActivityState(ACTIVITY_STATE.DRAWING)
            socket.emit(SocketEvent.SYNC_DRAWING, { socketId: socket.id })
        } else {
            setActivityState(ACTIVITY_STATE.CODING)
        }
    }

    const findFilePath = (
        item,
        targetId,
        currentPath = [],
    ) => {
        if (item.id === targetId) {
            return [...currentPath, item.name]
        }
        if (item.type === "directory" && item.children) {
            for (const child of item.children) {
                const res = findFilePath(child, targetId, [
                    ...currentPath,
                    item.name,
                ])
                if (res) return res
            }
        }
        return null
    }

    // Generate path parts, replacing 'root' with the project name 'code-sync'
    let pathParts = []
    if (activeFile) {
        const parts = findFilePath(fileStructure, activeFile.id)
        if (parts) {
            pathParts = parts.map((p) => (p === "root" ? "code-sync" : p))
        }
    } else {
        pathParts = ["code-sync"]
    }

    const copyInviteLink = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            toast.success("Room invite link copied!")
        } catch (error) {
            toast.error("Failed to copy link")
            console.error(error)
        }
    }

    return (
        <div className="topbar">
            <div className="topbar-left">
                {/* Mobile hamburger */}
                <button
                    className="mobile-menu-btn"
                    onClick={onToggleSidebar}
                    title="Toggle Sidebar"
                    aria-label="Toggle Sidebar"
                >
                    <HiOutlineMenuAlt2 size={20} />
                </button>
                <div className="logo">
                    <IoCodeSlash aria-hidden="true" />
                    <span>CodeSync</span>
                </div>
                <div className="breadcrumb">
                    {pathParts.map((part, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            {index > 0 && <span className="separator">/</span>}
                            <span
                                className={
                                    index === pathParts.length - 1
                                        ? "text-primary font-medium"
                                        : "opacity-60"
                                }
                            >
                                {part}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="topbar-right">
                <div className="live-label">
                    <span className="status-dot pulsing"></span>
                    <span>
                        {users.length} {users.length === 1 ? "live" : "live"}
                    </span>
                </div>
                <div className="avatars">
                    {users.slice(0, 3).map((u, i) => {
                        const initials = u.username
                            .slice(0, 2)
                            .toUpperCase()
                        return (
                            <div
                                key={u.socketId}
                                className={`avatar av${(i % 4) + 1}`}
                                title={u.username}
                            >
                                {initials}
                            </div>
                        )
                    })}
                    {users.length > 3 && (
                        <div className="avatar av4">+{users.length - 3}</div>
                    )}
                </div>
                <button 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-colorBackgroundTertiary border border-colorBorderSecondary text-xs hover:bg-colorBackgroundSecondary transition-colors text-textPrimary font-medium"
                    onClick={toggleMode}
                >
                    {activityState === ACTIVITY_STATE.CODING ? (
                        <>
                            <MdOutlineDraw size={14} className="text-textSecondary" />
                            <span>Board</span>
                        </>
                    ) : (
                        <>
                            <IoCodeSlash size={14} className="text-textSecondary" />
                            <span>Code</span>
                        </>
                    )}
                </button>
                <button className="invite-btn" onClick={copyInviteLink}>
                    <LuUserPlus aria-hidden="true" />
                    <span>Invite</span>
                </button>
                {/* Mobile right panel toggle */}
                <button
                    className="mobile-menu-btn"
                    onClick={onToggleRightPanel}
                    title="Toggle Panel"
                    aria-label="Toggle Panel"
                >
                    <PiChatCircleDots size={20} />
                </button>
            </div>
        </div>
    )
}

export default Topbar
