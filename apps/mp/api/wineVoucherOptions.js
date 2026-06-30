const request = require('../utils/request');

function listActive() {
  return request({
    url: '/wine-voucher-options',
    method: 'GET',
    silent: true,
  });
}

function redeem(optionId, data) {
  return request({
    url: `/wine-voucher-options/${optionId}/redeem`,
    method: 'POST',
    data,
    silent: true,
  });
}

module.exports = {
  listActive,
  redeem,
};

