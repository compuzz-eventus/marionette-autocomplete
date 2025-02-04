
  class AutoComplete.CollectionView extends Marionette.CollectionView

    ###*
     * @type {String}
    ###
    tagName: 'div'

    ###*
     * @type {String}
    ###
    childViewContainer: 'ul'

    ###*
     * @type {String}
    ###
    className: 'ac-suggestions dropdown-menu'

    ###*
     * @type {Object}
    ###
    attributes:
      style: 'width: 100%;'

    template: _.template "<ul></ul>"
    
    ###*
     * @return {Marionette.View}
    ###
    emptyView:
      Marionette.View.extend
        tagName: 'li',
        template: _.template "<span>No suggestions available</span>"

    initialize: () ->
      @loading = false

    collectionEvents:
      'sync': 'endLoading',
      'request': 'startLoading',
      'all:loaded': 'onAllLoaded'

    onScroll: (event) ->
      if !@loading
        lastFith = event.currentTarget.querySelector('li:nth-last-child(5)')
        boundingClientRect = lastFith.getBoundingClientRect()
        ulRect = event.currentTarget.getBoundingClientRect()
        if boundingClientRect.top >= ulRect.top and boundingClientRect.bottom <= ulRect.bottom
          @collection.trigger 'load:more'
          @loading = true

    onRender: ->
      @$el.find('ul').on 'scroll', (e) =>
        @onScroll(e)

    onAllLoaded: () ->
      @collection.each _.bind(((model) ->
        if model.get(@options.collection.options.valueKey) == @options.collection.query
          @$el.parent().parent().find('.js-edit-record').attr 'title', if model.get('name') then model.get('name') else ''
          @$el.parent().attr 'title', if model.get('name') then model.get('name') else ''
      ), this)

    endLoading: () ->
      @loading = false

    startLoading: () ->
      @loading = true