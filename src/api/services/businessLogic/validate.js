const MATERIALS_REQUIRED_ERROR_MESSAGE = 'materials required';
const MATERIALS_INVALID_ERROR_MESSAGE = 'materials are invalid';
const CUSTOMER_OR_TRANSPORTATION_REQUIRED_ERROR_MESSAGE = 'customer or transportation information required';
const WEIGHTS_REQUIRED_ERROR_MESSAGE = 'weights required';
const CUSTOMER_REQUIRED_ERROR_MESSAGE = 'customer required';
const NET_VALUE_REQUIRED_ERROR_MESSAGE = 'netValue required';
// eslint-disable-next-line max-len
const INCOMPLETE_TICKET_ERROR_MESSAGE = 'Incomplete ticket requires (Customer customerCommonIdentifierString) OR (transportation information – any field) OR (material code/name) OR (truck weights)';

const validateMaterialsOnTicket = ticket => {
  if (ticket.materials && ticket.materials.length > 0) {
    for (const material of ticket.materials) {
      if (
        !isValidResource(material, 'weightAndPrice') ||
          !isValidResource(material.weightAndPrice, 'gross') ||
          !isValidResource(material.weightAndPrice, 'tare') ||
          !isValidResource(material.weightAndPrice, 'netWeight')
      ) {
        return false;
      }
    }
    return true;
  }
  return true;
};

const validateCustomerOnTicket = ticket => {
  if (ticket.customer && ticket.customer.customerCommonIdentifierString) {
    return true;
  }
  return false;
};

const validateMaterialsAreOnTicket = ticket => ticket.materials && ticket.materials.length > 0;

const validateWeightsOnTicket = ticket =>
  isValidResource(ticket, 'transportationInfo') &&
  isValidResource(ticket, 'truckWeight') &&
  isValidResource(ticket, 'loadWeight');

const validateTransportationInfoOnTicket = ticket => {
  // check one of carrier, carrierNumber, trailerNumber is filled out
  const { transportationInfo } = ticket;
  if (isValidResource(transportationInfo, 'carrier') || isValidResource(transportationInfo, 'carrierNumber') ||
      isValidResource(transportationInfo, 'trailerNumber')) {
    return true;
  }
  return false;
};

// customer name or transportation information OR material code/name OR truck weights
const INBOUND_TICKET_INCOMPLETE_VALIDATION_RULES = [
  {
    isValid: ticket => {
      if (validateCustomerOnTicket(ticket)) {
        return true;
      }

      if (isValidResource(ticket, 'transportationInfo') && validateTransportationInfoOnTicket(ticket)) {
        return true;
      }

      if (isValidResource(ticket, 'truckWeight')) {
        return true;
      }

      if (validateMaterialsAreOnTicket(ticket)) {
        return true;
      }

      return false;
    },
    // eslint-disable-next-line max-len
    errorMsg: INCOMPLETE_TICKET_ERROR_MESSAGE,
  },
  {
    isValid: ticket => validateMaterialsOnTicket(ticket),
    errorMsg: MATERIALS_INVALID_ERROR_MESSAGE,
  },
];

// Scale Complete
// (Customer Name OR transportation information – any field) AND (material code/name AND truck weights and all
// material Weights)
const INBOUND_TICKET_SCALE_COMPLETE_VALIDATION_RULES = [
  //  customer name or transportation info
  {
    isValid: ticket => {
      if (validateCustomerOnTicket(ticket)) {
        return true;
      }

      if (isValidResource('transportationInfo') && validateTransportationInfoOnTicket(ticket)) {
        return true;
      }
      return false;
    },
    errorMsg: CUSTOMER_OR_TRANSPORTATION_REQUIRED_ERROR_MESSAGE,
  },
  {
    isValid: ticket => validateWeightsOnTicket(ticket),
    errorMsg: WEIGHTS_REQUIRED_ERROR_MESSAGE,
  },
  {
    isValid: ticket => validateMaterialsAreOnTicket(ticket),
    errorMsg: MATERIALS_REQUIRED_ERROR_MESSAGE,
  },
  {
    isValid: ticket => validateMaterialsOnTicket(ticket),
    errorMsg: MATERIALS_INVALID_ERROR_MESSAGE,
  },
];

// Price Complete
// Customer Name AND every material must have a code, price, and individual weights
const INBOUND_TICKET_PRICE_COMPLETE_VALIDATION_RULES = [
  {
    isValid: ticket => validateCustomerOnTicket(ticket),
    errorMsg: CUSTOMER_REQUIRED_ERROR_MESSAGE,
  },
  {
    isValid: ticket => validateMaterialsAreOnTicket(ticket),
    errorMsg: MATERIALS_REQUIRED_ERROR_MESSAGE,
  },
  {
    isValid: ticket => validateMaterialsOnTicket(ticket),
    errorMsg: MATERIALS_INVALID_ERROR_MESSAGE,
  },
  {
    isValid: ticket => validateWeightsOnTicket(ticket),
    errorMsg: WEIGHTS_REQUIRED_ERROR_MESSAGE,
  },
  {
    isValid: ticket => isValidResource(ticket, 'netValue'),
    errorMsg: NET_VALUE_REQUIRED_ERROR_MESSAGE,
  },
];

const MATERIAL_VALIDATION_RULES = [
  {
    isValid: ( dictionary, idx ) =>
      dictionary[ idx ].code && dictionary[ idx ].commonName,
    errorMsg: 'Material at line x is missing a code or common name',
  },
  // {
  //   isValid: ( dictionary, idx ) =>
  //     ( isValidResource(dictionary[ idx ].material) &&
  //       isValidResource(dictionary[ idx ].commodity) ) ||
  //     !isValidResource(dictionary[ idx ].material),
  //   errorMsg: 'Material and commodity at line x are missing an id',
  // },
  {
    isValid: ( dictionary, idx ) => {
      for (let j = idx + 1; j < dictionary.length; j++) {
        if (dictionary[ idx ].code === dictionary[ j ].code) {
          return false;
        }
      }
      return true;
    },
    errorMsg: 'More than one material has the same code',
  },
  {
    isValid: ( dictionary, idx ) => {
      for (let j = idx + 1; j < dictionary.length; j++) {
        if (
          dictionary[ idx ].commonName ===
          dictionary[ j ].commonName
        ) {
          return false;
        }
      }
      return true;
    },
    errorMsg: 'More than one material has the same common name',
  },
  {
    isValid: ( dictionary, idx ) => {
      for (let j = idx + 1; j < dictionary.length; j++) {
        if (
          isValidResource(dictionary[ idx ]) &&
          isValidResource(dictionary[ j ]) &&
            dictionary[ idx ].id === dictionary[ j ].id
        ) {
          return false;
        }
      }
      return true;
    },
    errorMsg: 'More than one material have the same id',
  },
];

const COMMODITY_VALIDATION_RULES = [
  {
    isValid: ( dictionary, idx ) =>
      dictionary[ idx ].code &&
      dictionary[ idx ].name &&
      dictionary[ idx ].type,
    errorMsg: 'Commodity at line x is missing a code, name, or type',
  },
  {
    isValid: ( dictionary, idx ) => {
      for (let j = idx + 1; j < dictionary.length; j++) {
        if (
          dictionary[ idx ].code === dictionary[ j ].code &&
          ( dictionary[ idx ].name !== dictionary[ j ].name ||
            dictionary[ idx ].type !== dictionary[ j ].type )
        ) {
          return false;
        }
      }
      return true;
    },
    errorMsg: 'Commodity Code matches more than one name or type',
  },
];

const PRICE_SHEET_VALIDATION_RULES = [
  {
    isValid: dictionary => {
      for (let j = 0; j < dictionary.length; j++) {
        if (dictionary[ j ].type === 'DEFAULT') {
          return true;
        }
      }
      return false;
    },
    errorMsg: 'No Default Price Sheet found',
  },
];

const BENCHMARK_VALIDATION_RULES = [
  {
    isValid: ( dictionary, idx ) =>
      dictionary[ idx ].benchmarkType &&
      dictionary[ idx ].benchmarkPrice &&
      dictionary[ idx ].benchmarkPrice.amount &&
      dictionary[ idx ].benchmarkPrice.precision &&
      dictionary[ idx ].benchmarkPrice.currency,
    errorMsg: 'Benchmark missing type or price',
  },
];

const PACKING_LIST_CREATE_VALIDATION_RULES = [
  {
    isValid: packingList => {
      if (isValidResource(packingList, 'finishedGoodsIds')) {
        return true;
      }
      return false;
    },
    errorMsg: 'finishedGoodsIds array is required',
  },
  {
    isValid: packingList => {
      if (isValidResource(packingList, 'finishedGoodsIds') && packingList.finishedGoodsIds.length > 0) {
        return true;
      }
      return false;
    },
    errorMsg: 'at least one finished good is required',
  },
];

const PACKING_LIST_UPDATE_VALIDATION_RULES = [
  {
    isValid: packingList => {
      if (isValidResource(packingList, 'id')) {
        return true;
      }
      return false;
    },
    errorMsg: 'id is required',
  },
  {
    isValid: packingList => {
      const AVAILABLE_STATUS = 'AVAILABLE';
      const SHIPPED_STATUS = 'SHIPPED';

      if (isValidResource(packingList, 'status')) {
        if (packingList.status === AVAILABLE_STATUS || packingList.status === SHIPPED_STATUS) {
          return true;
        }
      }
      return false;
    },
    errorMsg: 'status is required, SHIPPED or AVAILABLE',
  },
  {
    isValid: packingList => {
      if (isValidResource(packingList, 'finishedGoodsIds') && packingList.finishedGoodsIds.length > 0) {
        return true;
      }
      return false;
    },
    errorMsg: 'finishedGoodsIds array is required and at least one finished good',
  },
];

const PRICE_ENTRY_VALIDATION_RULES = [
  {
    isValid: ( dictionary, idx ) =>
      isValidResource(dictionary[ idx ].price, 'amount') &&
      isValidResource(dictionary[ idx ].price, 'currency') &&
      isValidResource(dictionary[ idx ].price, 'precision'),
    errorMsg: 'Entry missing price',
  },
  {
    isValid: ( dictionary, idx ) => {
      if (
        dictionary[ idx ].priceType === 'SPREAD' &&
        ( !isValidResource(dictionary[ idx ].spreadValue, 'amount') ||
          !isValidResource(dictionary[ idx ].spreadValue, 'currency') ||
          !isValidResource(dictionary[ idx ].spreadValue, 'precision') )
      ) {
        return false;
      }
      return !(
        dictionary[ idx ].priceType === 'PERCENTAGE' &&
        dictionary[ idx ].percentageValue === undefined
      );
    },
    errorMsg: 'Entry missing spread or percentage value',
  },
  {
    isValid: ( dictionary, idx ) =>
      dictionary[ idx ].materialCode || dictionary[ idx ].materialId,
    errorMsg: 'Material Code and Id is missing.  At least one is required',
  },
];

function isValidResource( element, property = 'id' ) {
  return (
    element &&
    // eslint-disable-next-line no-prototype-builtins
    element.hasOwnProperty(property) &&
    element[ property ] !== undefined
  );
}

const getValidationErrors = ( rules, dictionary, idx ) => {
  for (let i = 0; i < rules.length; i++) {
    if (!rules[ i ].isValid(dictionary, idx)) {
      return rules[ i ].errorMsg;
    }
  }
  return false;
};

module.exports = {
  getValidationErrors,
  isValidResource,
  COMMODITY_VALIDATION_RULES,
  MATERIAL_VALIDATION_RULES,
  BENCHMARK_VALIDATION_RULES,
  PRICE_ENTRY_VALIDATION_RULES,
  PRICE_SHEET_VALIDATION_RULES,
  INBOUND_TICKET_INCOMPLETE_VALIDATION_RULES,
  INBOUND_TICKET_SCALE_COMPLETE_VALIDATION_RULES,
  INBOUND_TICKET_PRICE_COMPLETE_VALIDATION_RULES,
  PACKING_LIST_CREATE_VALIDATION_RULES,
  PACKING_LIST_UPDATE_VALIDATION_RULES,
};
