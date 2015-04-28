// Front-End Sample
// Coded by Gina Maini 
// Weekend of the 27th, February 2015
// Frameworks & Libraries used: Backbone.js, jQuery.js

// =========== Models =============

var TableRow = Backbone.Model.extend({
	initialize: function () {
		var pd = this.prettyDateFormat(this.get('end_date')); 
		this.set({ pretty_end_date: pd });

		var dr = this.dateRangeFormat(this.get('start_date'), this.get('end_date'));
		this.set({ dateRange: dr }); 

		var pbw = this.progressBarWidth(this.get('current_step'), this.get('total_steps'));
		this.set({ progressBarWidth: pbw });
	}, 

	prettyDateFormat: function (UnixTime) {
		var milliTime = new Date(UnixTime * 1000); // to make it Milliseconds
		var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		var year = milliTime.getFullYear();
		var month = months[milliTime.getMonth()];
		var date = milliTime.getDate();
		var prettyTime = month + ' ' + date + ', ' + year;
		return prettyTime;
	},

	dateRangeFormat: function(startDate, endDate) {
		var sDateInMili = new Date(startDate * 1000);
		var eDateInMili = new Date(endDate * 1000);

		var sYear = sDateInMili.getUTCFullYear();
		var sMonth = sDateInMili.getUTCMonth() + 1; //months from 1-12
		var sDate = sDateInMili.getUTCDate();

		var eYear = eDateInMili.getUTCFullYear();
		var eMonth = eDateInMili.getUTCMonth() + 1; //months from 1-12
		var eDate = eDateInMili.getUTCDate();

		var dateRange = '' + sMonth + '/' + sDate + '/' + sYear + ' to ' + eMonth + '/' + eDate + '/' + eYear + '';
		return dateRange;
	}, 

	progressBarWidth: function (currentStep, endStep) {
		if (endStep === 0 || ((typeof(currentStep) && typeof(endStep)) !== 'number')) {
			return 0;
		} else {
			var ratio = currentStep / endStep; 
			return Math.round(ratio * 100);
		}
	}
}); 

// =========== Collections =============

var Table = Backbone.Collection.extend({ 
	model: TableRow,

    url: '../challenge.json',

    parse: function (response) {
    	return response.projects;
    },

    initialize: function () {
        this.fetch({
            error: this.fetchError,
            remove: false,
            success: this.fetchSuccess
        });
        // set a comparator to show default "view all" 
        // sorted by nearest due date at top
        this.comparator = function (model) {
        	return model.get('end_date');
        } 
        this.sort();
    },

    fetchError: function (collection, response) {
        throw new Error('There was a table data fetch error');
    }
});

// =========== Views =============

var ProjectDetailsView = Backbone.View.extend({
	events: {
		'click ._edit_' : 'edit',
		'click ._save_' : 'save',
		'click ._exit_' : 'exit', 
		'click ._plus-minus_' : 'expandCollapse', 
		'click ._arrow_' : 'nextProject'
	},

	initialize: function () {
		this.render();
	}, 

	render: function () {
		this.generateProjectView(this.model);
	}, 		

	edit: function () {
		$('._content-editable_').attr('contentEditable', 'true');
		$('._save_').toggleClass('-is-editing');
	}, 

	save: function () {
		var newDescription = $('_content-editable_').val();
		this.model.set({ description: newDescription }); 
		// if this were more than a simple HTTP server, I would use: 
		// this.model.save({ description: newDescription }, { patch: true }); 
		// and that way the description could actually save to server
		// or I could set up localStorage... 

		$('._content-editable_').attr('contentEditable', 'false');
		$('._save_').toggleClass('-is-editing');
	},

	generateProjectView: function (model) {
		$('._gray-background_').remove(); // clear the current projects

		var projectViewTemplate = $('#detailViewTemplate').html();
		var makeProjectView = _.template(projectViewTemplate);
		this.$el.append(makeProjectView({ 'project' : model }));
	},

	expandCollapse: function (e) {
		var $ct = $(e.currentTarget);

		$ct.parent().toggleClass('-closed'); 
		// have to put it on the parent because you can't 
		// toggleClass on SVGs in jQuery. Only attr() 
		// which is annoying... 
		$ct.parent().next('._open-close_').toggleClass('-closed');
	},

	nextProject: function () {
		var mod = this.model;
		var coll = this.model.collection;
		var currentIndex = coll.indexOf(coll.at(mod.get('id')));
		var nextProject = coll.at(currentIndex + 1);

		this.undelegateEvents();

		if (_.isEmpty(nextProject)) {
			return new ProjectDetailsView({
				model: coll.at(0),
				el: this.el, 
				events: this.events
			})
		} else {
			return new ProjectDetailsView({
				model: nextProject,
				el: this.el,
				events: this.events
			})
		}
	},

	exit: function () {
		$('._gray-background_').remove();
		this.undelegateEvents();
	}
})

var TableView = Backbone.View.extend({
	el: $('._table_'), 

	events: {
		'click .-filter': 'filterTable',
		'click ._modal-opener_': 'beginDetailView'
	},

	initialize: function () {
		this.collection = new Table();

		// becuse fetch is async, you don't wanna have a race condition
		this.listenTo(this.collection, 'sort', this.render);
	},

	render: function () {
		this.appendTableRows(this.collection);

		return this; // backbone convention 
	}, 

	appendTableRows: function (coll) {
		$('._filteredBody_').empty(); // clear the current projects

		var tableRowTemplate = $('#tableRowTemplate').html();
		var makeTableRows = _.template(tableRowTemplate);
		$('._filteredBody_').append(makeTableRows({'rows' : coll }));
	},

	filterTable: function (e) {
		$('.-filter').removeClass('-active'); // clear active filters
		var $current = $(e.currentTarget);
		$current.toggleClass('-active'); // toggle just clicked filter

		if ($current.hasClass('_active_')) {
			var activeProjects = this.collection.where({ active: true });
			var Active = new Backbone.Collection(activeProjects);
			this.appendTableRows(Active);
		} else if ($current.hasClass('_inactive_')) {
			var inactiveProjects = this.collection.where({ active: false });
			var Inactive = new Backbone.Collection(inactiveProjects);
			this.appendTableRows(Inactive);
		} else {
			this.appendTableRows(this.collection);
		}
	},

	beginDetailView: function(e) {
		var thisModelID = $(e.currentTarget).data('id');
		var thisModel = this.collection.get(thisModelID);

		return new ProjectDetailsView({ 
			model : thisModel,
			el : this.el
		});
	}
});

var tableView = new TableView(); 
