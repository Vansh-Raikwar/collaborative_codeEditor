import { useState } from "react"
import ChatList from "@/components/chats/ChatList"
import ChatInput from "@/components/chats/ChatInput"
import CopilotView from "@/components/sidebar/sidebar-views/CopilotView"
import RunView from "@/components/sidebar/sidebar-views/RunView"
import SettingsView from "@/components/sidebar/sidebar-views/SettingsView"
import cn from "classnames"
import { IoClose } from "react-icons/io5"

function RightPanel({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState("comments")

    return (
        <aside className={cn("right-panel", { open: isOpen })}>
            <div className="panel-tabs">
                {/* Mobile close button */}
                <button
                    className="mobile-close-btn"
                    onClick={onClose}
                    title="Close Panel"
                    aria-label="Close Panel"
                    style={{ margin: "0 4px 0 8px" }}
                >
                    <IoClose size={16} />
                </button>
                <button
                    className={`panel-tab ${activeTab === "comments" ? "active" : ""}`}
                    onClick={() => setActiveTab("comments")}
                >
                    Comments
                </button>
                <button
                    className={`panel-tab ${activeTab === "ai" ? "active" : ""}`}
                    onClick={() => setActiveTab("ai")}
                >
                    AI Copilot
                </button>
                <button
                    className={`panel-tab ${activeTab === "run" ? "active" : ""}`}
                    onClick={() => setActiveTab("run")}
                >
                    Run Code
                </button>
                <button
                    className={`panel-tab ${activeTab === "settings" ? "active" : ""}`}
                    onClick={() => setActiveTab("settings")}
                >
                    Settings
                </button>
            </div>
            <div className="panel-body h-full flex flex-col overflow-hidden p-0 bg-colorBackgroundSecondary">
                {activeTab === "comments" && (
                    <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3 h-full">
                        <div className="text-xs font-semibold text-textTertiary uppercase tracking-wider mb-1">
                            Group Discussion
                        </div>
                        <ChatList />
                        <ChatInput />
                    </div>
                )}
                {activeTab === "ai" && (
                    <div className="flex-1 overflow-y-auto">
                        <CopilotView />
                    </div>
                )}
                {activeTab === "run" && (
                    <div className="flex-1 overflow-y-auto">
                        <RunView />
                    </div>
                )}
                {activeTab === "settings" && (
                    <div className="flex-1 overflow-y-auto">
                        <SettingsView />
                    </div>
                )}
            </div>
        </aside>
    )
}

export default RightPanel
