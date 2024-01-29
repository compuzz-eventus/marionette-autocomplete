
  class AutoComplete.CollectionView extends Marionette.CollectionView

    ###*
     * @type {String}
    ###
    tagName: 'ul'

    ###*
     * @type {String}
    ###
    className: 'ac-suggestions dropdown-menu'

    ###*
     * @type {Object}
    ###
    attributes:
      style: 'width: 100%;'

    ###*
     * @return {Marionette.ItemView}
    ###
    emptyView:
      Marionette.ItemView.extend
        tagName: 'li',
        template: _.template "<a>No suggestions available</a>"

    initialize: () ->
      @loading = false
      @allLoaded = false

    events:
      'scroll': 'onScroll'
    collectionEvents:
      'sync': 'addLoading',
      'request': 'startLoading',
      'all:loaded': 'onAllLoaded'

    onScroll: (event) ->
      if !@allLoaded and !@loading
        lastFith = event.currentTarget.querySelector('li:nth-last-child(5)')
        boundingClientRect = lastFith.getBoundingClientRect()
        ulRect = event.currentTarget.getBoundingClientRect()
        if boundingClientRect.top >= ulRect.top and boundingClientRect.bottom <= ulRect.bottom
          @collection.trigger 'load:more'
          @loading = true

    onAllLoaded: () ->
      @allLoaded = true
      @collection.each _.bind(((model) ->
        if model.get(@options.collection.options.valueKey) == @options.collection.query
          @$el.parent().parent().find('.js-edit-record').attr 'title', if model.get('name') then model.get('name') else ''
          @$el.parent().attr 'title', if model.get('name') then model.get('name') else ''
      ), this)

    addLoading: () ->
      @loading = false
      @allLoaded = false

    startLoading: () ->
      @loading = true