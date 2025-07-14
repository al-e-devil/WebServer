import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../Config/database';
import { User } from './user.model';

export class Payment extends Model {
  public id!: number;
  public userId!: number;
  public amount!: number;
  public status!: string;
  public mp_payment_id!: string;
}

Payment.init({
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
  mp_payment_id: { type: DataTypes.STRING, allowNull: false }
}, {
  sequelize,
  tableName: 'payments',
});

Payment.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Payment, { foreignKey: 'userId' });