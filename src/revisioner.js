const _ = require('lodash');
const Sequelize = require('sequelize');
const uuidv4 = require('uuid/v4');

class Revisioner {
  constructor(sequelize, options = {}) {
    this.sequelize = sequelize;

    this.options = {
      modelName: options.modelName || 'revision',
      uuidPrimaryKey: options.uuidPrimaryKey || false,
      instancePrimaryKeyType: options.instancePrimaryKeyType || Sequelize.INTEGER,
      jsonb: options.jsonb || false,
    };

    const model = {};

    if (this.options.uuidPrimaryKey) {
      model.id = {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      };
    } else {
      model.id = {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      };
    }

    model.instanceType = {
      type: Sequelize.TEXT,
      allowNull: false,
    };

    model.instanceId = {
      type: this.options.instancePrimaryKeyType,
      allowNull: false,
    };

    if (this.options.jsonb) {
      model.body = {
        type: Sequelize.JSONB,
        defaultValue: {},
      };
    } else {
      model.body = {
        type: Sequelize.TEXT,
        defaultValue: '{}',
        get() {
          return JSON.parse(this.getDataValue('body'));
        },
        set(val) {
          this.setDataValue('body', JSON.stringify(val));
        },
      };
    }

    this.model = this.sequelize.define(this.options.modelName, model);
  }

  enable(model, options = {}) {
    const destroy = options.destroy || true;

    model.hook('beforeSave', (instance, hookOptions) => {
      const revision = {
        instanceType: model.name,
        instanceId: instance.id,
        body: instance.get({ plain: true }),
      };

      if (this.options.uuidPrimaryKey) {
        revision.id = uuidv4();
      }

      return this.model.create(revision, { transaction: hookOptions.transaction });
    });

    if (destroy) {
      model.hook('afterDestroy', (instance, hookOptions) => this.model.destroy({
        where: {
          instanceId: instance.id,
          instanceType: model.name,
        },
        transaction: hookOptions.transaction,
      }));
    }
  }

  findAll(parent, options = {}) {
    const optionsCopy = _.cloneDeep(options);

    if (!optionsCopy.attributes) {
      optionsCopy.attributes = ['id', 'createdAt'];
    }

    if (!optionsCopy.where) {
      optionsCopy.where = {};
    }
    optionsCopy.where.instanceId = parent.id;
    optionsCopy.where.instanceType = parent.constructor.name;

    if (!optionsCopy.order) {
      optionsCopy.order = [['createdAt', 'ASC']];
    }

    return this.model.findAll(optionsCopy);
  }

  findOne(parent, revisionId) {
    const options = {
      where: {
        id: revisionId,
        instanceId: parent.id,
        instanceType: parent.constructor.name,
      },
    };
    return this.model.findOne(options);
  }
}

module.exports = Revisioner;
