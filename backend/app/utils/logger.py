import logging
import sys


def setup_logger(name: str = "green-transit", level: int = logging.INFO) -> logging.Logger:
    """
    Set up a logger with console handler and optional file handler.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    if logger.handlers:
        return logger
    
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger


def get_logger(name: str = "green-transit") -> logging.Logger:
    """Get an existing logger or create a new one."""
    return logging.getLogger(name)


__all__ = ["setup_logger", "get_logger"]