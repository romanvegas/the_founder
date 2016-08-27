import util from 'util';
import _ from 'underscore';
import Task from './Task';
import Perk from './Perk';
import Enums from '../Enums';
import Promo from './Promo';
import Effect from './Effect';
import Worker from './Worker';
import Product from './Product';
import offices from 'data/offices.json';

const BASE_BURNOUT_RATE = 0.01;
const BASE_TAX_RATE = 0.3;

class Company {
  constructor(data, player) {
    var data = data || {};
    this.player = player || {};
    this.player.company = this;
    _.extend(this, {
      name: 'DEFAULTCORP',
      cash: 0,
      workers: [],
      productTypes: [],
      productBonuses: {},
      workerBonuses: {
        happiness: 1,
        productivity: 1,
        marketing: 1,
        design: 1,
        engineering: 1,
        burnoutRate: 0
      },
      office: Enums.Office.Apartment,

      deathToll: 0,
      debtOwned: 0,
      taxesAvoided: 0,
      pollution: 0,

      lifetimeRevenue: 0,
      lifetimeCosts: 0,
      annualRevenue: 0,
      annualCosts: 0,
      lastAnnualRevenue: 0,
      lastAnnualCosts: 0,

      perks: [],
      locations: [],
      verticals: [],
      technologies: [],
      specialProjects: [],
      lobbies: [],
      markets: [],
      acquisitions: [],
      discoveredProducts: [],
      activeProducts: [],
      productsLauched: 0,

      hype: 0,
      outrage: 0,
      tasks: []
    }, data);
  }

  getWorkerBonus(attr) {
    return this.workerBonuses[attr] || 0;
  }
  getProductBonus(attr, vertical) {
    var bonuses = this.productBonuses[vertical] || {};
    return bonuses[attr] || 0;
  }

  get burnoutRate() {
    return BASE_BURNOUT_RATE + this.getWorkerBonus('burnoutRate');
  }

  updateBurnout() {
    var self = this;
    _.each(this.workers, w => Worker.updateBurnout(w, self));
  }

  skill(name, workers, locations, scaleByProductivity) {
    // company bonus from workers are applied for each worker
    var self = this,
        player = this.player,
        workers = workers || this.workers,
        locations = locations || this.locations,
        scaleByProductivity = scaleByProductivity || false;
    var companyBonusFromWorkers = _.reduce(workers, function(m, w) {
      return m + Worker.companyBonus(w, name);
    }, 0);
    var fromWorkers = Math.max(0, _.reduce(workers, function(m, w) {
      if (w.burnout > 0) {
        return m;
      } else {
        return m + ((Worker[name](w, player) + companyBonusFromWorkers) * (scaleByProductivity ? Worker.productivity(w, player) : 1));
      }
    }, 0));
    var fromLocations = Math.max(0, _.reduce(locations, function(m, l) {
      return m + ((l.skills[name] + self.getWorkerBonus(name) + companyBonusFromWorkers) * (scaleByProductivity ? l.skills.productivity : 1));
    }, 0));
    return fromWorkers + fromLocations;
  }

  get productivity() {
    return this.skill('productivity');
  }
  get happiness() {
    return this.skill('happiness');
  }
  get design() {
    return this.skill('design');
  }
  get engineering() {
    return this.skill('engineering');
  }
  get marketing() {
    return this.skill('marketing');
  }

  get sizeLimit() {
    return offices[this.office].size;
  }
  get remainingSpace() {
    return this.sizeLimit - this.workers.length;
  }

  get annualProfit() {
    return this.annualRevenue - this.annualCosts;
  }
  get salaries() {
    return _.reduce(this.workers, function(mem, w) {
      return mem + w.salary;
    }, 0);
  }
  get rent() {
    return _.reduce(this.locations, function(mem, l) {
      return mem + l.cost;
    }, 0)/1000 * this.player.costMultiplier * 12;
  }
  get taxes() {
    return this.annualRevenue * this.player.taxRate;
  }

  canAfford(cost) {
    return this.cash - cost >= 0;
  }
  earn(cash) {
    this.cash += cash;
    this.annualRevenue += cash;
    this.lifetimeRevenue += cash;
  }
  pay(cost, ignoreAfford) {
    if (this.cash - cost >= 0 || ignoreAfford) {
      this.cash -= cost;
      this.annualCosts += cost;
      this.lifetimeCosts += cost;
      return true;
    }
    return false;
  }
  payMonthly() {
    this.pay(this.salaries + this.rent);
  }
  payAnnual() {
    var expectedTaxes = this.annualRevenue * BASE_TAX_RATE;
    this.taxesAvoided += expectedTaxes - this.taxes;
    this.pay(this.taxes);
    this.annualRevenue = 0;
  }

  hireEmployee(worker, salary) {
    worker.salary = salary;
    this.workers.push(worker);
  }

  hasPerk(perk) {
    return util.contains(this.perks, perk);
  }
  buyPerk(perk) {
    if (this.pay(Perk.next(perk).cost)) {
      if (!this.hasPerk(perk)) {
        this.perks.push(perk);
      } else {
        perk.upgradeLevel++;
      }
      Effect.applies(Perk.current(perk).effects, this.player);
      return true;
    }
    return false;
  }
  buyAcquisition(acquisition) {
    if (this.pay(acquisition.cost)) {
      this.acquisitions.push(acquisition);
      Effect.applies(acquisition.effects, this.player);

      // check if an associated AI company is now defeated
      var competitor = util.byName(this.player.competitors, acquisition.name);
      if (competitor) {
        competitor.disabled = true;
      }
      return true;
    }
    return false;
  }
  specialProjectIsAvailable(specialProject) {
    var self = this;
    return _.every(specialProject.requiredProducts, function(prod) {
      return _.contains(self.discoveredProducts, prod);
    });
  }
  buyVertical(vertical) {
    if (this.pay(vertical.cost)) {
      this.verticals.push(vertical);
      return true;
    }
    return false;
  }
  productTypeIsAvailable(pt) {
    return util.containsByName(this.verticals, pt.requiredVertical) && util.contains(this.player.unlocked.productTypes, pt);
  }
  buyProductType(pt) {
    if (this.productTypeIsAvailable(pt) && this.pay(pt.cost)) {
      this.productTypes.push(pt);
      return true;
    }
    return false;
  }
  researchIsAvailable(tech) {
    var self = this;
    return util.containsByName(this.verticals, tech.requiredVertical) &&
      _.every(tech.requiredTechs, function(t) {
        return util.containsByName(self.technologies, t);
      });
  }
  buyLocation(location) {
    if (this.pay(location.cost)) {
      this.locations.push(location);
      if (!_.contains(this.markets, location.market)) {
        this.markets.push(location.market);
      }
      Effect.applies(location.effects, this.player);
      return true;
    }
    return false;
  }

  develop() {
    _.each(this.tasks, t => Task.develop(t, this));
  }

  startResearch(tech) {
    if (this.researchIsAvailable(tech) && this.canAfford(tech.cost)) {
      return Task.init('Research', tech);
    }
    return false;
  }

  startProduct(productTypes) {
    var product = Product.create(productTypes, this);
    return Task.init('Product', product);
  }

  startPromo(promo) {
    if (this.canAfford(promo.cost)) {
      promo = Promo.init(promo);
      return Task.init('Promo', promo);
    }
    return false;
  }

  startTask(task, workers, locations) {
    Task.start(task, workers, locations);
    this.tasks.push(task);
  }

  startLobby(lobby) {
    if (this.canAfford(lobby.cost)) {
      return Task.init('Lobby', _.extend({persuasion:0}, lobby));
    }
    return false;
  }

  startSpecialProject(specialProject) {
    if (this.specialProjectIsAvailable(specialProject) && this.canAfford(specialProject.cost)) {
      return Task.init('SpecialProject', _.extend({
        design: 0,
        marketing: 0,
        engineering: 0
      }, specialProject));
    }
    return false;
  }

  harvestRevenue() {
    var self = this;
    _.each(this.activeProducts, function(p) {
      self.earn(Product.getRevenue(p));
      if (Math.round(p.revenue) <= 10) {
        self.activeProducts = _.without(self.activeProducts, p);
      }
    });
  }

  harvestCompanies() {
    var newRevenue = _.reduce(this.acquisitions, function(mem, c) {
      return mem + c.revenue/12;
    }, 0);
    this.cash += newRevenue;
    this.annualRevenue += newRevenue;
    this.lifetimeRevenue += newRevenue;
  }

  decayHype() {
    Promo.decayHype(this);
  }

  growEmployees() {
    _.each(this.workers, function(worker) {
      Worker.grow(worker);
    });
  }

  task(id) {
    return _.find(this.tasks, t => t.id == id);
  }

  get nextOffice() {
    switch (this.office) {
      case 0:
        return util.byName(offices, 'office');
      case 1:
        return util.byName(offices, 'campus');
      default:
        return;
    }
  }
  upgradeOffice() {
    var next = this.nextOffice;
    if (next && this.pay(next.cost)) {
      this.office = next.level;
      return true;
    };
    return false;
  }

  get perkUpgrades() {
    return _.flatten(_.map(this.perks, function(p) {
      return _.filter(perk.upgrades, function(u, i) {
        return i <= p.upgradeLevel;
      });
    }));
  }
}

export default Company;