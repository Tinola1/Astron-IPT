import * as yup from 'yup';

const PH_PHONE = /^(\+?63|0)?9\d{9}$/;
const onlyDelivery = (schema, msg) => ({ is: 'delivery', then: (s) => s.required(msg) });

// needsInstall: cart has an installation add-on, so a preferred date is mandatory
export const makeCheckoutSchema = (needsInstall) =>
  yup.object({
    fulfillment: yup.string().oneOf(['delivery', 'pickup']).required(),
    recipient: yup.string().trim().when('fulfillment', onlyDelivery(null, 'Recipient name is required')),
    phone: yup.string().trim().when('fulfillment', {
      is: 'delivery',
      then: (s) => s.required('Phone is required').matches(PH_PHONE, 'Enter a valid PH mobile number'),
    }),
    street: yup.string().trim().when('fulfillment', onlyDelivery(null, 'Street address is required')),
    barangay: yup.string().trim(),
    city: yup.string().trim().when('fulfillment', onlyDelivery(null, 'City is required')),
    province: yup.string().trim().when('fulfillment', onlyDelivery(null, 'Province is required')),
    postalCode: yup.string().trim(),
    saveAddress: yup.boolean(),
    installationDate: needsInstall
      ? yup
          .string()
          .required('Choose a preferred installation date')
          .test('future', 'Pick a date from tomorrow onward', (v) => {
            if (!v) return false;
            const endToday = new Date();
            endToday.setHours(23, 59, 59, 999);
            return new Date(v) > endToday;
          })
      : yup.string(),
    paymentMethod: yup.string().required('Select a payment method'),
    promoCode: yup.string().trim(),
  });