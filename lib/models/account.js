const models = require('./index')

module.exports = (sequelize, DataTypes) => {
  var Account = sequelize.define('Account', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV1,
    },
    blockchainAccount: DataTypes.TEXT,
    internalChain: DataTypes.TEXT,
    balance: {
      type: DataTypes.BIGINT,
      defaultValue: 0
    },
    hash: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  Account.associate = function (models) {
    Account.hasMany(models.Transaction, {as: 'Txs'})
  };
  return Account;
};