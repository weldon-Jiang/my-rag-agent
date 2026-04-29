class AgentException(Exception):
    def __init__(self, message: str, code: str = "AGENT_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)

    def to_dict(self):
        return {
            "success": False,
            "error": self.message,
            "code": self.code
        }


class AIServiceException(AgentException):
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message, "AI_SERVICE_ERROR")
        self.original_error = original_error


class SessionNotFoundException(AgentException):
    def __init__(self, session_id: str):
        super().__init__(f"Session not found: {session_id}", "SESSION_NOT_FOUND")
        self.session_id = session_id


class InvalidRequestException(AgentException):
    def __init__(self, message: str):
        super().__init__(message, "INVALID_REQUEST")


class UnauthorizedException(AgentException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, "UNAUTHORIZED")


class RateLimitException(AgentException):
    def __init__(self, message: str = "Too many requests"):
        super().__init__(message, "RATE_LIMIT_EXCEEDED")


class VectorStoreException(AgentException):
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message, "VECTOR_STORE_ERROR")
        self.original_error = original_error


class ToolExecutionException(AgentException):
    def __init__(self, tool_name: str, message: str):
        super().__init__(f"Tool '{tool_name}' execution failed: {message}", "TOOL_EXECUTION_ERROR")
        self.tool_name = tool_name