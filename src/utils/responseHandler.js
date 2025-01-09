export const handleSuccess = (res, { message, data, statusCode = 200 }) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  };
  
  export const handleError = (res, statusCode = 500, message = 'Internal server error') => {
    return res.status(statusCode).json({
      success: false,
      message
    });
  };