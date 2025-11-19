import _ from 'underscore';
import $ from 'jquery';
import Marionette from 'backbone.marionette';
import Backbone from 'backbone';
import { Collection } from './Collection.js';
import { CollectionView } from './CollectionView.js';
import { ChildView } from './ChildView.js';

export class Behavior extends Marionette.Behavior {
  defaults() {
    return {
      rateLimit: 0,
      minLength: 0,
      collection: {
        class: Collection,
        options: {
          type: 'remote',
          remote: null,
          data: [],
          parseKey: null,
          valueKey: 'value',
          keys: { query: 'query', limit: 'limit' },
          values: { query: null, limit: 20 },
        },
      },
      collectionView: { class: CollectionView },
      childView: { class: ChildView },
    };
  }

  eventPrefix = 'autocomplete';
  actionKeysMap = { 27: 'esc', 13: 'enter', 38: 'up', 40: 'down' };

  events() {
    return {
      'keydown @ui.autocomplete': 'onKeyDown',
      'keyup @ui.autocomplete': 'onKeyUp',
      'click @ui.autocomplete': '_stopPropagationWhenVisible',
      'shown.bs.dropdown': 'setDropdownShown',
      'hidden.bs.dropdown': 'setDropdownHidden',
      'focusout @ui.autocomplete': 'focusOutInput',
    };
  }

  initialize(options) {
    this.visible = false;
    // deep merge like $.extend(true, ...)
    this.options = $.extend(true, {}, this.defaults(), options);
    this.suggestions = new this.options.collection.class([], this.options.collection.options);
    this.updateQuery = _.throttle(this._updateQuery.bind(this), this.options.rateLimit);
    this._startListening();
  }

  _startListening() {
    this.listenTo(this.suggestions, 'selected', this.completeQuery);
    this.listenTo(this.suggestions, 'highlight', this.fillQuery);
    this.listenTo(this.suggestions, 'open', this.openDropdown);
    this.listenTo(this.view, `${this.eventPrefix}:find`, this.findRelatedSuggestions);
  }

  onRender() {
    this._setInputAttributes();
    this._buildElement();
  }

  _buildElement() {
    this.container = $('<div class="ac-container dropdown"></div>');
    this.collectionView = this.getCollectionView();
    this.ui.autocomplete.replaceWith(this.container);
    this.container.append(this.ui.autocomplete).append(this.collectionView.render().el);
  }

  getCollectionView() {
    return new this.options.collectionView.class({ childView: this.options.childView.class, collection: this.suggestions });
  }

  _setInputAttributes() {
    this.ui.autocomplete.attr({
      autocomplete: 'off',
      spellcheck: 'off',
      dir: 'auto',
      'data-toggle': 'dropdown',
    });
  }

  onKeyDown($e) {
    const key = $e.which || $e.keyCode;
    if (!(this.ui.autocomplete.val().length < this.options.minLength)) {
      if (this.actionKeysMap[key]) {
        $e.preventDefault();
        $e.stopPropagation();
        this.doAction(key, $e);
      } else if (key !== 9 && key !== 16) {
        // ignore tab or shift-tab
        clearTimeout(this.searchTimeout);
        setTimeout(() => {
          this.updateQuery(this.ui.autocomplete.val());
        }, 300);
      }
    }
  }

  onKeyUp($e) {
    const key = $e.which || $e.keyCode;
    if (!(this.ui.autocomplete.val().length < this.options.minLength)) {
      if (this.actionKeysMap[key]) {
        $e.preventDefault();
        $e.stopPropagation();
      }
    }
  }

  doAction(keycode) {
    if (!this.suggestions.isEmpty()) {
      switch (this.actionKeysMap[keycode]) {
        case 'enter':
          this.suggestions.trigger('select');
          break;
        case 'down':
          this.suggestions.trigger('highlight:next');
          break;
        case 'up':
          this.suggestions.trigger('highlight:previous');
          break;
        case 'esc':
          this.trigger(`${this.eventPrefix}:close`);
          break;
      }
    }
  }

  _stopPropagationWhenVisible(e) {
    if (this.visible) e.stopPropagation();
  }

  setDropdownShown() {
    this.visible = true;
    this.view.trigger(`${this.eventPrefix}:shown`);
    this.updateQuery(this.ui.autocomplete.val());
  }

  setDropdownHidden() {
    this.visible = false;
    this.view.trigger(`${this.eventPrefix}:hidden`);
  }

  toggleDropdown = () => {
    if (this.view && !this.view.isDestroyed()) {
      this.ui.autocomplete.dropdown('toggle');
      this.visible = this.ui.autocomplete.parent().hasClass('open');
    }
  };

  openDropdown = () => {
    if (this.view && !this.view.isDestroyed()) {
      this.ui.autocomplete.parent().addClass('open');
      this.visible = true;
    }
  };

  closeDropdown = () => {
    if (this.view && !this.view.isDestroyed()) {
      this.ui.autocomplete.parent().removeClass('open');
      this.visible = false;
    }
  };

  findRelatedSuggestions = (query) => {
    this.ui.autocomplete.val(query);
    this.updateQuery(query);
    this.toggleDropdown();
  };

  _updateQuery = (query) => {
    this.suggestions.trigger('find', query);
  };

  fillQuery = (suggestion) => {
    this.ui.autocomplete.val(suggestion.get('value'));
    this.view.trigger(`${this.eventPrefix}:active`, suggestion);
  };

  completeQuery = (suggestion) => {
    this.isDropdownClicked = true;
    this.fillQuery(suggestion);
    this.view.trigger(`${this.eventPrefix}:selected`, suggestion);
    this.toggleDropdown();
  };

  focusOutInput = () => {
    this.isDropdownClicked = false;
    setTimeout(() => {
      if (!this.isDropdownClicked) {
        this.executeFocusOutInput();
      }
    }, 300);
  };

  executeFocusOutInput = () => {
    if (this.view.isDestroyed()) return;
    const inputValue = this.ui.autocomplete.val()?.toLowerCase();
    let doClose = false;
    if (this.view.model) {
      if (this.view.model instanceof Backbone.Model) {
        doClose = this.view.model.get(this.options.collection.options.valueKey)?.toLowerCase() === inputValue;
      } else {
        doClose = this.view.model?.toLowerCase() === inputValue;
      }
    }
    if (doClose) {
      this.closeDropdown();
      return;
    }
    const suggestion = this.suggestions.find((model) => {
      const value = model.get('value');
      return value?.toLowerCase() === inputValue;
    });
    if (suggestion) {
      this.fillQuery(suggestion);
      this.view.trigger(this.eventPrefix + ':selected', suggestion);
    } else {
      this.ui.autocomplete.val('');
      this.view.trigger(`${this.eventPrefix}:selected`, null);
    }
    this.closeDropdown();
  };

  onDestroy() {
    this.collectionView.destroy();
  }
}

export default Behavior;
