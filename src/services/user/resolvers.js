import moment from 'moment';
import crypto from 'crypto';
import {oncePerServices} from '../../common/services/index';

export default oncePerServices((services) => {
    const {
      postgres = require('../postgres'),
    } = services;
  
  const userList = (builderContext) => {
    return async (obj, args, context) => {
      const statement = (() => {
        const whereParams = [];

        // function to avoid copypast of simple 'where params'
        const pushToWhereParams = ({
          argName,
          dbColName,
        }) => {
          if (argName in args) {
            whereParams.push(`${dbColName} = ${args[argName]}`);
          }
        };

        pushToWhereParams({ argName: 'isManager', dbColName: 'manager' });
        pushToWhereParams({ argName: 'isBlocked', dbColName: 'blocked' });

        if ('search' in args) {
          whereParams.push(` (name LIKE '%${args.search}%'
             OR login LIKE '%${args.search}%')`);
        }

        const whereSubStr = !whereParams.length ? '' :
          `WHERE ${whereParams.join('\n AND ')}`;

        return `SELECT
          user_id,
          login,
          name,
          email,
          manager,
          blocked,
          data
        FROM users
        ${whereSubStr}`;
      })();

      const { rows } = await postgres.exec({ statement });

      const DbToGqlMapping = (obj) => ({
        id: obj.user_id,
        login: obj.login,
        fio: obj.name,
        email: obj.email,
        isManager: !!obj.manager,
        isBlocked: !!obj.blocked,
        birthdate: obj.data && moment(obj.data.birthday).format('DD.MM.YYYY') || '',
      });

      return rows.map(DbToGqlMapping);
    }
  }

  const authUser = (builderContext) => {
    return async (obj, args, context) => {
      try {
        const {
          login,
          password,
        } = args;

        if (Object.keys(args).length !== 2) {
          throw new Error(`Must provide login and password`);
        }

        const statement = `SELECT
          login,
          password_hash
        FROM users
        WHERE login='${login}' `;

        const { rows } = await postgres.exec({ statement });

        if (!rows.length) {
          throw new Error(`User with login '${login}' not found`);
        }

        const foundUser = rows[0];
        // create new hash & compare it with hash from DB
        const argHash = crypto.createHash('md5').update(password).digest('hex');
        if (argHash !== foundUser.password_hash) {
          throw new Error('Wrong password');
        }

        return {
          ok: true,
          error: '',
        };
      } catch (err) {
        return {
          ok: false,
          error: err.message,
        };
      }

    }
  }

  return {
    userList,
    authUser,
  }
});
