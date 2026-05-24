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
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { useEffect } from "react"
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

    return (
        <div className="app-root">
            <Topbar />
            <div className="main-workspace">
                <LeftSidebar />
                <WorkSpace />
                <RightPanel />
            </div>
            <Statusbar />
        </div>
    )
}

export default EditorPage
