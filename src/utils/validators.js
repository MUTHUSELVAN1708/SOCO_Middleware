export const validateProduct = (productData) => {
    const errors = [];
  
    // Basic validation rules
    if (!productData.basicInfo?.productTitle) {
      errors.push('Product title is required');
    }
  
    if (!productData.pricing?.regularPrice) {
      errors.push('Regular price is required');
    }
  
    // if (productData.variants?.length > 0) {
    //   const skus = new Set();
    //   productData.variants.forEach(variant => {
    //     if (!variant.sku) {
    //       errors.push('SKU is required for all variants');
    //     }
    //     if (skus.has(variant.sku)) {
    //       errors.push('Duplicate SKU found in variants');
    //     }
    //     skus.add(variant.sku);
    //   });
    // }
  
    return {
      isValid: errors.length === 0,
      errors
    };
  };