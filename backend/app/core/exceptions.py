from fastapi import HTTPException, status


class ExamPilotException(HTTPException):
    """Base exception for all ExamPilot errors."""
    pass


class UnauthorizedException(ExamPilotException):
    def __init__(self, detail: str = "Unauthorized. Please login again."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )


class NotFoundException(ExamPilotException):
    def __init__(self, detail: str = "Resource not found."):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )


class BadRequestException(ExamPilotException):
    def __init__(self, detail: str = "Bad request."):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class RateLimitExceededException(ExamPilotException):
    def __init__(self, detail: str = "Daily parse limit exceeded. Upgrade to premium for more."):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
        )


class InternalServerException(ExamPilotException):
    def __init__(self, detail: str = "Something went wrong. Please try again."):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        )