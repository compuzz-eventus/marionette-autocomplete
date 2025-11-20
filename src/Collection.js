import _ from 'underscore';
import $ from 'jquery';
import Backbone from 'backbone';

export class Collection extends Backbone.Collection {
  initialize(models, options = {}) {
    this.options = options;
    this.setDataset(this.options.data);
    this._startListening();
    this.loading = false;
  }

  _startListening() {
    this.listenTo(this, 'find', this.fetchNewSuggestions);
    this.listenTo(this, 'select', this.select);
    this.listenTo(this, 'highlight:next', this.highlightNext);
    this.listenTo(this, 'highlight:previous', this.highlightPrevious);
    this.listenTo(this, 'clear', this.reset);
    this.listenTo(this, 'load:more', this.loadMore);
  }

  setDataset(dataset) {
    this.dataset = this.parse(dataset, false);
  }

  parse(suggestions = [], limit) {
    if (!suggestions) return [];
    if (this.options.parseKey) {
      suggestions = this.getValue(suggestions, this.options.parseKey);
    }
    if (limit) {
      suggestions = _.take(suggestions, this.options.values.limit);
    }
    return _.map(suggestions, (suggestion) => _.extend(suggestion, { value: this.getValue(suggestion, this.options.valueKey) }));
  }

  getValue(obj, prop) {
    if (!obj || !prop) return undefined;
    return _.reduce(prop.split('.'), (segment, property) => segment && segment[property], obj);
  }

  fetchNewSuggestions(query) {
    this.trigger('open');
    this.reset([]);
    switch (this.options.type) {
      case 'remote': {
        const method = this.options.method || 'GET';
        const contentType = method === 'POST' ? 'application/x-www-form-urlencoded' : 'application/json';
        const params = this.getParams(query);
        return this.fetch(Object.assign({
          url: this.options.remote,
          reset: true,
          type: method,
          contentType
        }, params));
      }
      case 'dataset':
        return this.filterDataSet(query);
      default:
        throw new Error('Unkown type passed');
    }
  }

  filterDataSet(query) {
    const matches = [];
    this.index = -1;
    _.each(this.dataset, (suggestion) => {
      if (matches.length >= this.options.values.limit) return false;
      if (this.matches(suggestion.value, query)) matches.push(suggestion);
    });
    this.set(matches);
  }

  matches(suggestion, query) {
    suggestion = this.normalizeValue(suggestion);
    query = this.normalizeValue(query);
    return suggestion.indexOf(query) >= 0;
  }

  normalizeValue(string = '') {
    return String(string).toLowerCase().replace(/^\s*/g, '').replace(/\s{2,}/g, ' ');
  }

  select() {
    if (this.isStarted()) return;
    this.trigger('selected', this.at(this.index));
  }

  highlightPrevious() {
    if (!(this.isFirst() || !this.isStarted())) {
      this.removeHighlight(this.index);
      this.highlight(this.index = this.index - 1);
    }
  }

  highlightNext() {
    if (this.options.lazyLoad && this.is5thFromLast() && !this.loading && !this.allLoaded) {
      this.loadMore();
    }
    if (!this.isLast()) {
      if (this.isStarted()) this.removeHighlight(this.index);
      this.highlight(this.index = this.index + 1);
    }
  }

  isFirst() { return this.index === 0; }
  isLast() { return this.index + 1 === this.length; }
  is5thFromLast() { return this.index + 1 === this.length - 5; }
  isStarted() { return this.index !== -1; }

  highlight(index) {
    const model = this.at(index);
    if (model) model.trigger('highlight', model);
    return model;
  }

  removeHighlight(index) {
    const model = this.at(index);
    if (model) model.trigger('highlight:remove', model);
    return model;
  }

  reset(models = [], options) {
    this.index = -1;
    this.allLoaded = false;
    if (models && models.rows) models = models.rows;
    const length = _.filter(models, (model) => !model.autocompleteAdd).length;
    if (length < this.options.values.limit) this.allLoaded = true;
    return super.reset(models, options);
  }

  loadMore() {
    if (this.loading || this.allLoaded) return;
    this.loading = true;
    const url = this.options.remote;
    const params = $.param(this.getParams(this.currentQuery).data);

    if (this.options.method === 'POST') {
      $.ajax({
        url,
        type: 'POST',
        data: params,
        contentType: 'application/x-www-form-urlencoded',
        success: (resp) => {
          this.parse(resp.rows);
          this.push(resp.rows);
          this.loading = false;
          this.trigger('sync');
          if (this.length === resp.records) {
            this.allLoaded = true;
            this.trigger('all:loaded');
          }
        }
      });
    } else {
      $.ajax({
        url: `${url}&${params}`,
        success: (resp) => {
          this.parse(resp.rows);
          this.push(resp.rows);
          this.loading = false;
          this.trigger('sync');
          if (this.length === resp.records) {
            this.allLoaded = true;
            this.trigger('all:loaded');
          }
        }
      });
    }
  }

  getParams(query) {
    this.currentQuery = query;
    const data = {};
    data[this.options.keys.query] = query;
    _.each(this.options.keys, (value, key) => {
      if (data[value] == null) data[value] = this.options.values[key];
    });
    data.first = this.length;
    return { data };
  }
}

export default Collection;
