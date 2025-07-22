package com.hoooon22.devzip.Exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class TraceBoardException extends RuntimeException {
    
    private final ErrorCode errorCode;
    private final HttpStatus httpStatus;
    private final Object[] args;

    public TraceBoardException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.httpStatus = errorCode.getHttpStatus();
        this.args = null;
    }

    public TraceBoardException(ErrorCode errorCode, Object... args) {
        super(String.format(errorCode.getMessage(), args));
        this.errorCode = errorCode;
        this.httpStatus = errorCode.getHttpStatus();
        this.args = args;
    }

    public TraceBoardException(ErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
        this.httpStatus = errorCode.getHttpStatus();
        this.args = null;
    }

    public TraceBoardException(ErrorCode errorCode, Throwable cause, Object... args) {
        super(String.format(errorCode.getMessage(), args), cause);
        this.errorCode = errorCode;
        this.httpStatus = errorCode.getHttpStatus();
        this.args = args;
    }
}