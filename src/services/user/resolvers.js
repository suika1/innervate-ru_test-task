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
        birthdate: obj.data && obj.data.birthday || '',
      });

      return rows.map(DbToGqlMapping);
    }
  }

  return {
    userList,
  }
});
