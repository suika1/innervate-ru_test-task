import { oncePerServices } from '../../common/services/index'

export default oncePerServices((services) => {
  
  const graphqlBuilderSchema = require('../../common/graphql/LevelBuilder.schema');
  
  const resolvers = require('./resolvers').default(services);
  
  return async function builder(args) {
    
    graphqlBuilderSchema.build_options(args);
    const { parentLevelBuilder, typeDefs, builderContext } = args;
    
    typeDefs.push(`
      type User {
        id: Int,
        login: String
        fio: String
        email: String
        isManager: Boolean
        isBlocked: Boolean
        birthdate: String
      }
    `);
    
    parentLevelBuilder.addQuery({
      name: `userList`,
      type: `[User]`,
      args: `
        isManager: Boolean,
        isBlocked: Boolean,
        search: String
      `,
      resolver: resolvers.userList(builderContext),
    });
    
  }
});
