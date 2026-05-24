import { useAppContext } from "@/context/AppContext"
import { useChatRoom } from "@/context/ChatContext"
import { useEffect, useRef } from "react"
import Avatar from "react-avatar"

function ChatList() {
    const {
        messages,
        isNewMessage,
        setIsNewMessage,
        lastScrollHeight,
        setLastScrollHeight,
    } = useChatRoom()
    const { currentUser } = useAppContext()
    const messagesContainerRef = useRef(null)

    const handleScroll = (e) => {
        const container = e.target
        setLastScrollHeight(container.scrollTop)
    }

    // Scroll to bottom when messages change
    useEffect(() => {
        if (!messagesContainerRef.current) return
        messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight
    }, [messages])

    useEffect(() => {
        if (isNewMessage) {
            setIsNewMessage(false)
        }
        if (messagesContainerRef.current)
            messagesContainerRef.current.scrollTop = lastScrollHeight
    }, [isNewMessage, setIsNewMessage, lastScrollHeight])

    return (
        <div
            className="flex-grow overflow-auto rounded-md bg-darkHover p-2"
            ref={messagesContainerRef}
            onScroll={handleScroll}
        >
            {/* Chat messages */}
            {messages.map((message, index) => {
                const isOwnMessage = message.username === currentUser.username
                return (
                    <div
                        key={message.id || index}
                        className={
                            "flex items-start gap-2.5 mb-4 animate-fade-in " +
                            (isOwnMessage ? "justify-end" : "justify-start")
                        }
                    >
                        {!isOwnMessage && (
                            <Avatar
                                name={message.username}
                                size="28"
                                round={true}
                                textSizeRatio={2}
                                className="flex-shrink-0 transition-transform hover:scale-105"
                            />
                        )}
                        <div className={"flex flex-col max-w-[75%] " + (isOwnMessage ? "items-end" : "items-start")}>
                            <div className="flex items-center gap-2 mb-1">
                                {!isOwnMessage && (
                                    <span className="text-[11px] font-semibold text-gray-400">
                                        {message.username}
                                    </span>
                                )}
                                <span className="text-[9px] text-gray-500 font-mono">
                                    {message.timestamp}
                                </span>
                                {isOwnMessage && (
                                    <span className="text-[11px] font-semibold text-indigo-400">
                                        You
                                    </span>
                                )}
                            </div>
                            <div
                                className={
                                    "px-4 py-2.5 text-xs shadow-md break-words " +
                                    (isOwnMessage
                                        ? "rounded-2xl rounded-tr-none bg-[#534AB7] text-[#EEEDFE] shadow-[#534ab724]"
                                        : "rounded-2xl rounded-tl-none bg-[#171820] border border-[#2d2e3b] text-[#f3f4f6]")
                                }
                            >
                                <p className="leading-relaxed whitespace-pre-wrap">{message.message}</p>
                            </div>
                        </div>
                        {isOwnMessage && (
                            <Avatar
                                name={currentUser.username}
                                size="28"
                                round={true}
                                textSizeRatio={2}
                                className="flex-shrink-0 transition-transform hover:scale-105"
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default ChatList
