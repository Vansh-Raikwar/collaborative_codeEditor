import ConnectionStatusPage from "@/components/connection/ConnectionStatusPage"
import WorkSpace from "@/components/workspace"
import Topbar from "@/components/workspace/Topbar"
import LeftSidebar from "@/components/workspace/LeftSidebar"
import RightPanel from "@/components/workspace/RightPanel"
import Statusbar from "@/components/workspace/Statusbar"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useFullScreen from "@/hooks/useFullScreen"
import useUserActivity from "@/hooks/useUserActivity"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

function EditorPage() {
    // Listen user online/offline status
    useUserActivity()
    // Enable fullscreen mode
    useFullScreen()
    const navigate = useNavigate()
    const { roomId } = useParams()
    const { status, setCurrentUser, currentUser } = useAppContext()
    const { socket } = useSocket()
    const location = useLocation()
    const { isMobile } = useWindowDimensions()

    // Mobile drawer states
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [rightPanelOpen, setRightPanelOpen] = useState(false)

    const toggleSidebar = useCallback(() => {
        setSidebarOpen((prev) => {
            if (!prev) setRightPanelOpen(false) // close right panel when opening sidebar
            return !prev
        })
    }, [])

    const toggleRightPanel = useCallback(() => {
        setRightPanelOpen((prev) => {
            if (!prev) setSidebarOpen(false) // close sidebar when opening right panel
            return !prev
        })
    }, [])

    const closeAllPanels = useCallback(() => {
        setSidebarOpen(false)
        setRightPanelOpen(false)
    }, [])

    // Close drawers when switching away from mobile
    useEffect(() => {
        if (!isMobile) {
            setSidebarOpen(false)
            setRightPanelOpen(false)
        }
    }, [isMobile])

    useEffect(() => {
        if (currentUser.username.length > 0) return
        const username = location.state?.username
        if (username === undefined) {
            navigate("/", {
                state: { roomId },
            })
        } else if (roomId) {
            const user = { username, roomId }
            setCurrentUser(user)
            socket.emit(SocketEvent.JOIN_REQUEST, user)
        }
    }, [
        currentUser.username,
        location.state?.username,
        navigate,
        roomId,
        setCurrentUser,
        socket,
    ])

    if (status === USER_STATUS.CONNECTION_FAILED) {
        return <ConnectionStatusPage />
    }

    const showOverlay = isMobile && (sidebarOpen || rightPanelOpen)

    return (
        <div className="app-root">
            <Topbar
                onToggleSidebar={toggleSidebar}
                onToggleRightPanel={toggleRightPanel}
            />
            <div className="main-workspace">
                {/* Overlay backdrop for mobile drawers */}
                <div
                    className={`sidebar-overlay ${showOverlay ? "visible" : ""}`}
                    onClick={closeAllPanels}
                />
                <LeftSidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                <WorkSpace />
                <RightPanel
                    isOpen={rightPanelOpen}
                    onClose={() => setRightPanelOpen(false)}
                />
            </div>
            <Statusbar />
        </div>
    )
}

export default EditorPage
