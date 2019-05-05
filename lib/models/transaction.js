module.exports = (sequelize, DataTypes) => {
  var Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV1,
    },
    amount: DataTypes.BIGINT,
    from: DataTypes.STRING,
    to: DataTypes.STRING,
    kind: DataTypes.ENUM('IN', 'OUT', 'INVEST', 'WAITING', 'INCOME'),
    AccountId: {
      type: DataTypes.UUID,
      references: {
        model: 'Accounts',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    timestampConfirm: { 
      type: DataTypes.BIGINT,
      allowNull: true
    },
    previousHash: DataTypes.TEXT,
    nextHash: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hash: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    salt: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    confirm: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    associatedTX: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  Transaction.associate = function (models) {
    Transaction.belongsTo(models.Account)
  };

  return Transaction;
};