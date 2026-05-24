const USER_CONNECTION_STATUS = Object.freeze({
    OFFLINE: "offline",
    ONLINE: "online",
})

const USER_STATUS = Object.freeze({
    INITIAL: "initial",
    CONNECTING: "connecting",
    ATTEMPTING_JOIN: "attempting-join",
    JOINED: "joined",
    CONNECTION_FAILED: "connection-failed",
    DISCONNECTED: "disconnected",
})

export { USER_CONNECTION_STATUS, USER_STATUS }
