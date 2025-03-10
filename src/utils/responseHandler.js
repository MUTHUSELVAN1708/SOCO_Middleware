import { v4 as uuidv4 } from "uuid";

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

  export const handleSuccessV1 = (res, statusCode = 200, message, data = null) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  };

  export const generateTrackingNumber = () => {
    const prefix = "TRK";
    const datePart = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(2, 12); // Extract YYYYMMDDHH format
    const uniqueId = uuidv4().split("-")[0].toUpperCase(); // Use a portion of UUID for uniqueness

    return `${prefix}${datePart}${uniqueId}`;
};
  