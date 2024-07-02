(function(){var a=function(a,c){function d(){this.constructor=a}for(var e in c)b.call(c,e)&&(a[e]=c[e]);return d.prototype=c.prototype,a.prototype=new d,a.__super__=c.prototype,a},b={}.hasOwnProperty,c=function(a,b){return function(){return a.apply(b,arguments)}};!function(a,b){return"function"==typeof define&&define.amd?define(["underscore","jquery","backbone","backbone.marionette"],function(c,d,e,f){return b(a,{},c,d,e,f)}):a.AutoComplete=b(a,{},a._,a.jQuery,a.Backbone,a.Backbone.Marionette)}(this,function(b,d,e,f,g,h){return d.Collection=function(b){function c(){return c.__super__.constructor.apply(this,arguments)}return a(c,b),c.prototype.initialize=function(a,b){return this.options=b,this.setDataset(this.options.data),this._startListening(),this.loading=!1},c.prototype._startListening=function(){return this.listenTo(this,"find",this.fetchNewSuggestions),this.listenTo(this,"select",this.select),this.listenTo(this,"highlight:next",this.highlightNext),this.listenTo(this,"highlight:previous",this.highlightPrevious),this.listenTo(this,"clear",this.reset),this.listenTo(this,"load:more",this.loadMore)},c.prototype.setDataset=function(a){return this.dataset=this.parse(a,!1)},c.prototype.parse=function(a,b){return this.options.parseKey&&(a=this.getValue(a,this.options.parseKey)),b&&(a=e.take(a,this.options.values.limit)),e.map(a,function(a){return e.extend(a,{value:this.getValue(a,this.options.valueKey)})},this)},c.prototype.getValue=function(a,b){return e.reduce(b.split("."),function(a,b){return a[b]},a)},c.prototype.getParams=function(a){var b;return b={},b[this.options.keys.query]=a,e.each(this.options.keys,function(a,c){return null!=b[a]?b[a]:b[a]=this.options.values[c]},this),"POST"===this.options.method&&(b.method="POST",b.contentType="application/x-www-form-urlencoded"),{data:b}},c.prototype.fetchNewSuggestions=function(a){var b,c;switch(this.options.type){case"remote":return c=this.options.method||"GET",b="application/json","POST"===c&&(b="application/x-www-form-urlencoded"),this.fetch(e.extend({url:this.options.remote,reset:!0,type:c,contentType:b},this.getParams(a)));case"dataset":return this.filterDataSet(a);default:throw new Error("Unkown type passed")}},c.prototype.filterDataSet=function(a){var b;return b=[],this.index=-1,e.each(this.dataset,function(c){return!(b.length>=this.options.values.limit)&&(this.matches(c.value,a)?b.push(c):void 0)},this),this.set(b)},c.prototype.matches=function(a,b){return a=this.normalizeValue(a),b=this.normalizeValue(b),a.indexOf(b)>=0},c.prototype.normalizeValue=function(a){return null==a&&(a=""),a.toLowerCase().replace(/^\s*/g,"").replace(/\s{2,}/g," ")},c.prototype.select=function(){return this.trigger("selected",this.at(this.isStarted()?this.index:0))},c.prototype.highlightPrevious=function(){if(!this.isFirst()&&this.isStarted())return this.removeHighlight(this.index),this.highlight(this.index=this.index-1)},c.prototype.highlightNext=function(){if(this.options.lazyLoad&&this.is5thFromLast()&&!this.loading&&!this.allLoaded&&this.loadMore(),!this.isLast())return this.isStarted()&&this.removeHighlight(this.index),this.highlight(this.index=this.index+1)},c.prototype.isFirst=function(){return 0===this.index},c.prototype.isLast=function(){return this.index+1===this.length},c.prototype.is5thFromLast=function(){return this.index+1===this.length-5},c.prototype.isStarted=function(){return this.index!==-1},c.prototype.highlight=function(a){var b;return b=this.at(a),b.trigger("highlight",b)},c.prototype.removeHighlight=function(a){var b;return b=this.at(a),b.trigger("highlight:remove",b)},c.prototype.reset=function(){return this.index=-1,this.allLoaded=!1,c.__super__.reset.apply(this,arguments)},c.prototype.loadMore=function(){var a,b,c,d;if(!this.loading&&!this.allLoaded)return this.loading=!0,c=this,d=c.options.remote,a=c.getParams(this.currentQuery,this.length),b=f.param(a.data),"POST"===c.options.method?f.ajax({url:d,type:"POST",data:b,contentType:"application/x-www-form-urlencoded",success:function(a){return function(b){if(c.parse(b),c.push(b),c.trigger("sync"),a.loading=!1,b.length!==c.options.values.limit)return a.allLoaded=!0,c.trigger("all:loaded")}}(this)}):f.ajax({url:d+"&"+b,success:function(a){return function(b){if(c.parse(b),c.push(b),c.trigger("sync"),a.loading=!1,b.length!==c.options.values.limit)return a.allLoaded=!0,c.trigger("all:loaded")}}(this)})},c.prototype.getParams=function(a,b){var c,d;return this.currentQuery=a,c={},d=this,c[d.options.keys.query]=a,e.each(d.options.keys,function(a,b){return c[a]=c[a]||d.options.values[b],c[a]}),c.first=b?b:"0",{data:c}},c}(g.Collection),d.ChildView=function(b){function c(){return c.__super__.constructor.apply(this,arguments)}return a(c,b),c.prototype.tagName="li",c.prototype.className="ac-suggestion",c.prototype.template=e.template('<a href="#"><%= value %></a>'),c.prototype.events={click:"select"},c.prototype.modelEvents={highlight:"highlight","highlight:remove":"removeHighlight"},c.prototype.highlight=function(){return this.$el.addClass("active")},c.prototype.removeHighlight=function(){return this.$el.removeClass("active")},c.prototype.select=function(a){return a.preventDefault(),a.stopPropagation(),this.model.trigger("selected",this.model)},c}(h.View),d.CollectionView=function(b){function c(){return c.__super__.constructor.apply(this,arguments)}return a(c,b),c.prototype.tagName="ul",c.prototype.className="ac-suggestions dropdown-menu",c.prototype.attributes={style:"width: 100%;"},c.prototype.emptyView=h.View.extend({tagName:"li",template:e.template("<a>No suggestions available</a>")}),c.prototype.initialize=function(){return this.loading=!1},c.prototype.events={scroll:"onScroll"},c.prototype.collectionEvents={sync:"endLoading",request:"startLoading","all:loaded":"onAllLoaded"},c.prototype.onScroll=function(a){var b,c,d;if(!this.loading&&(c=a.currentTarget.querySelector("li:nth-last-child(5)"),b=c.getBoundingClientRect(),d=a.currentTarget.getBoundingClientRect(),b.top>=d.top&&b.bottom<=d.bottom))return this.collection.trigger("load:more"),this.loading=!0},c.prototype.onAllLoaded=function(){return this.collection.each(e.bind(function(a){if(a.get(this.options.collection.options.valueKey)===this.options.collection.query)return this.$el.parent().parent().find(".js-edit-record").attr("title",a.get("name")?a.get("name"):""),this.$el.parent().attr("title",a.get("name")?a.get("name"):"")},this))},c.prototype.endLoading=function(){return this.loading=!1},c.prototype.startLoading=function(){return this.loading=!0},c}(h.CollectionView),d.Behavior=function(b){function g(){return this.toggleDropdown=c(this.toggleDropdown,this),g.__super__.constructor.apply(this,arguments)}return a(g,b),g.prototype.defaults={rateLimit:0,minLength:0,collection:{"class":d.Collection,options:{type:"remote",remote:null,data:[],parseKey:null,valueKey:"value",keys:{query:"query",limit:"limit"},values:{query:null,limit:20}}},collectionView:{"class":d.CollectionView},childView:{"class":d.ChildView}},g.prototype.eventPrefix="autocomplete",g.prototype.actionKeysMap={27:"esc",37:"left",39:"right",13:"enter",38:"up",40:"down"},g.prototype.events={"keyup @ui.autocomplete":"onKeyUp","click @ui.autocomplete":"_stopPropagationWhenVisible","shown.bs.dropdown":"setDropdownShown","hidden.bs.dropdown":"setDropdownHidden"},g.prototype.initialize=function(a){return this.visible=!1,this.options=f.extend(!0,{},this.defaults,a),this.suggestions=new this.options.collection["class"]([],this.options.collection.options),this.updateQuery=e.throttle(this._updateQuery,this.options.rateLimit),this._startListening()},g.prototype._startListening=function(){return this.listenTo(this.suggestions,"selected",this.completeQuery),this.listenTo(this.suggestions,"highlight",this.fillQuery),this.listenTo(this.view,this.eventPrefix+":find",this.findRelatedSuggestions)},g.prototype.onRender=function(){return this._setInputAttributes(),this._buildElement()},g.prototype._buildElement=function(){return this.container=f('<div class="ac-container dropdown"></div>'),this.collectionView=this.getCollectionView(),this.ui.autocomplete.replaceWith(this.container),this.container.append(this.ui.autocomplete).append(this.collectionView.render().el)},g.prototype.getCollectionView=function(){return new this.options.collectionView["class"]({childView:this.options.childView["class"],collection:this.suggestions})},g.prototype._setInputAttributes=function(){return this.ui.autocomplete.attr({autocomplete:!1,spellcheck:!1,dir:"auto","data-toggle":"dropdown"})},g.prototype.onKeyUp=function(a){var b;if(a.preventDefault(),a.stopPropagation(),b=a.which||a.keyCode,!(this.ui.autocomplete.val().length<this.options.minLength))return null!=this.actionKeysMap[b]?this.doAction(b,a):this.updateQuery(this.ui.autocomplete.val())},g.prototype.doAction=function(a,b){if(!this.suggestions.isEmpty())switch(this.actionKeysMap[a]){case"right":if(this.isSelectionEnd(b))return this.suggestions.trigger("select");break;case"enter":return this.suggestions.trigger("select");case"down":return this.suggestions.trigger("highlight:next");case"up":return this.suggestions.trigger("highlight:previous");case"esc":return this.trigger(this.eventPrefix+":close")}},g.prototype._stopPropagationWhenVisible=function(a){if(this.visible)return a.stopPropagation()},g.prototype.setDropdownShown=function(){return this.visible=!0,this.view.trigger(this.eventPrefix+":shown")},g.prototype.setDropdownHidden=function(){return this.visible=!1,this.view.trigger(this.eventPrefix+":hidden")},g.prototype.toggleDropdown=function(){if(!this.view&&!this.view.isDestroyed)return this.ui.autocomplete.dropdown("toggle")},g.prototype.findRelatedSuggestions=function(a){return this.ui.autocomplete.val(a),this.updateQuery(a),this.toggleDropdown()},g.prototype._updateQuery=function(a){return this.suggestions.trigger("find",a)},g.prototype.isSelectionEnd=function(a){return a.target.value.length===a.target.selectionEnd},g.prototype.fillQuery=function(a){return this.ui.autocomplete.val(a.get("value")),this.view.trigger(this.eventPrefix+":active",a)},g.prototype.completeQuery=function(a){return this.fillQuery(a),this.view.trigger(this.eventPrefix+":selected",a),this.toggleDropdown()},g.prototype.onDestroy=function(){return this.collectionView.destroy()},g}(h.Behavior),d})}).call(this);