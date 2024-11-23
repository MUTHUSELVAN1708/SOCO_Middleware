var errorHandling = (error, req, res, next) => {
    error.statusCode = error.statuscode || 500;
    error.status = error.status || "error";
  
    res.status(error.statusCode).json({
      timestamp: new Date(),
      err_status: error.statuscode,
      name: error.name,
      err_message: error.message,
      trace: error.stack,
    });
  };
  
  export default errorHandling;