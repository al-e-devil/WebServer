import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../Config/database';

export class User extends Model {
  public id!: number;
  public username!: string;
  public email!: string;
  public password_hash!: string;
  public balance!: number;
}

User.init({
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
}, {
  sequelize,
  tableName: 'users',
});