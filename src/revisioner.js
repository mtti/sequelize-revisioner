const Sequelize = require('sequelize');

class Revisioner {
  constructor(sequelize, options = {}) {
    this.sequelize = sequelize;

    this.options = {
      modelName: options.modelName || 'revision',
      uuidPrimaryKey: options.uuidRevisionPrimaryKey || false,
      instancePrimaryKeyType: options.instancePrimaryKeyType || Sequelize.INTEGER,
      jsonn: options.jsonb || false,
    };

    const model = {};

    if (this.options.uuidRevisionPrimaryKey) {
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
      return this.model.build(revision).save({ transaction: hookOptions.transaction });
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
}

module.exports = Revisioner;
