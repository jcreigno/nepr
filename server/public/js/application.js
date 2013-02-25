(function($, ko) {

    function Environnement(code, libelle) {
        this.code = code;
        this.libelle = libelle;
    }

    var trimFunc = (function (){
        var func = String.prototype.trim;
        if (!func) {
            func = function(){
                return this.replace(/^\s+/,'').replace(/\s\s*$/, '');
            };
        }
        return func;
    })();

    function trim (string){
        return trimFunc.apply(string);
    }

  function toParams(params){
    return Object.keys(params).map(function(key){
        return key + '=' + params[key];
    }).join('&');
  }

  function apiUrl (url, obj){
    return obj ? url + '?' + toParams(obj): url;
  }
	
	function formatDate(d) {
		var curr_date = d.getDate();
		var curr_month = d.getMonth() + 1; //Months are zero based
		var curr_year = d.getFullYear();
		return curr_year + '-' + (curr_month<=9?'0'+curr_month:curr_month) + '-' + curr_date;
	}

    var ENVS = [ new Environnement('prod', 'Production')
                , new Environnement('integr', 'Intégration')
                , new Environnement('re7', 'Recette')
                , new Environnement('dev', 'Développement') ];

    var COUCHES = { 'ent':'Entités'
            , 'med' : 'Mediation'
            , 'orc' : 'Orchestration'
            , 'use' : 'Usage'
            , 'reg' : 'Regles'
    };

	  ko.bindingHandlers.datepicker = {
            init: function (element, valueAccessor, allBindingsAccessor) {
                //initialize datepicker with some optional options
                var options = allBindingsAccessor().datepickerOptions || {};
                $(element).datepicker(options).on("changeDate", function (ev) {
                    var observable = valueAccessor();
                    observable(ev.date);
                });
            },
            update: function (element, valueAccessor) {
                var value = ko.utils.unwrapObservable(valueAccessor());
                $(element).datepicker("setValue", value);
            }
        };
	
    function AppErrorsViewModel(){
        var self = this;
        // Details for errors
        self.all = ko.observableArray([]);
        self.summary = ko.computed(function(){
            return self.all.slice(0, 10);
        });
        self.selected = ko.observable({});
        self.select = function(error) {
            self.selected(error);
        };
        // Pagination for errors
        self.pageSize = ko.observable(10);
        self.pageIndex = ko.observable(0);
        self.previousPage = function() {
            self.pageIndex(self.pageIndex() - 1);
        };
        self.nextPage = function() {
            self.pageIndex(self.pageIndex() + 1);
        };
        self.maxPageIndex = ko.computed(function() {
            return Math.ceil(self.all().length
                        / self.pageSize()) - 1;
        });
        self.pagedRows = ko.computed(function() {
            var size = self.pageSize();
            var start = self.pageIndex() * size;
            return self.all.slice(start, start + size);
        });
        self.stackElement = function(elem) {
            return trim(elem);
        };

    }

    function AppStatsViewModel(){
        var self = this;
        self.all = ko.observableArray([]);
        self.summary = ko.computed(function(){
            var groups = self.all();
            var result = {};
            Object.keys(groups).forEach(function(key){
                result[key] = groups[key].slice(0,10);
            });
            return result;
        });
        // Details for stats
        self.selected = ko.observable({});
    }


    // ViewModel for Knockout
    function AppViewModel() {
        var self = this;

        // Filters
        self.allEnvironnements = ko.observableArray(ENVS);
        self.environnement = ko.observable(ENVS[0]);

		// Dates
		self.startingDate = ko.observable(new Date());
		self.endingDate = ko.observable(new Date());
		
        // Navigation
        self.currentPage = ko.observable('home');
        self.getClassFor = function(page) {
            return self.currentPage() === page ? 'active' : '';
        };
        self.urlFor = function(page, params) {
            var base = '#/'
                + self.environnement().code
                + '/' + page || self.currentPage();
            if(params){
                base += '?' + toParams(params);
            }
            return base;
        };
        self.url = ko.computed(function() {
            return self.urlFor(self.currentPage());
        });
        self.refresh = function() {
            self.loadErrors();
            self.loadStats();
            $.sammy().setLocation(self.url());
        };

        // Summaries
        self.errors = new AppErrorsViewModel();
        self.stats = new AppStatsViewModel();

        self.selectStat = function(stat) {
            self.stats.selected(stat);
            self.loadPerfs(stat._id.service, stat._id.operation);
        };
        self.selectedPerfs = ko.observableArray([]);
        self.selectedPerfsMetrix = ko.observable({});

        // Traces
        self.requestId = ko.observable('');
        self.requestIdDetails = ko.observableArray([]);

        self.getRequestIdDetails = function() {
            self.loadTraces();
        };
        
        self.dateRange =  ko.computed(function(){
          return {
            startingDate : formatDate(self.startingDate()),
            endingDate : formatDate(self.endingDate())
          };
        });
        
        // REST calls
        self.loadTraces = function () {
            $.getJSON('/traces/'
                    + self.environnement().code
                    + '/' + self.requestId(), function(data) {
                self.requestIdDetails(data);
            });
        };
        self.loadErrors = function () {
            $.getJSON(apiUrl('/errors/' + self.environnement().code, self.dateRange()), function(data) {
                self.errors.all(data);
            });
        };
        self.loadStats = function () {
            $.getJSON(apiUrl('/stats/' + self.environnement().code, self.dateRange()), function(data) {
                // Sort data
                var sortedData = data.sort(function(d1, d2) {
                    return d1.value.count < d2.value.count;
                });
                // Group by : couche
                var groupedStats = {};
                sortedData.forEach(function(item) {
                    var couche = item._id.couche;
                    var group = groupedStats[couche]
                                || (groupedStats[couche] = []);
                    group.push(item);
                });
                self.stats.all(groupedStats);
            });
        };
        self.loadPerfs = function (service, operation) {
            $.getJSON(apiUrl('/perfs/'
                    + self.environnement().code
                    + '/' + service
                    + '/' + operation, self.dateRange()), function(data) {
                self.selectedPerfs(data);
                if(d3){
                    self.graphPerfs();
                }
            });
        };
        self.graphPerfs = function() {
                var todate = function(str){
                    var d = str.substring(0,str.indexOf(','))
                                .split(' ').join('T');
                    return new Date(d);
                };
                var data = self.selectedPerfs();
                var maxval = 0;
                var minval = Number.MAX_VALUE;
                // chart data
                var chartData = data.slice(data.length - 100, data.length).reverse()
                        .map(function(item) {
                    maxval = Math.max(maxval, item.elapsed);
                    minval = Math.min(minval, item.elapsed);
                    return {
                        'date' : item.date,
                        'elapsed' : item.elapsed,
                        'requestid' : item.requestid
                    };
                });
                self.selectedPerfsMetrix({
                    'minval' : minval,
                    'maxval' : maxval
                });

                var divs = d3.select("#perfChart")
                             .selectAll("div").data(chartData);
                divs.enter().append("div").attr("class", "bar tooltipaware");
                divs.exit().remove();

                divs.style("height", function(d) {
                    var h = d.elapsed * 200 / maxval;
                    return h + "px";
                }).style("width", function(d) {
                    var w = 500 / chartData.length;
                    return w + "px";
                }).attr('data-placement', 'left').attr('title', function(d) {
                    return "[" + d.date + "] : " + d.elapsed + " ms";
                }).on('click',function(d){
                    $.sammy().setLocation(self.urlFor('traces',{'requestid':d.requestid}));
                });
        };
        self.couche = function(coucheId){
            return COUCHES[coucheId] ? COUCHES[coucheId] : coucheId;
        };
    }


    // When document is ready ...
    $(document).ready(function() {
          // Apply bindings
        var model = new AppViewModel();

        $.sammy(function(app) {
            // all routes
            this.get('#/:env/:page', function(context) {
                model.currentPage(context.params.page);
                model.environnement(model.allEnvironnements()
                        .filter(function(item) {
                    return item.code === context.params.env;
                }).pop());
                if(context.params.requestid){
                    model.requestId(context.params.requestid);
                    model.getRequestIdDetails();
                }
            });

            this.get('/', function(){});
        }).run();

        // Enable tooltips
        $('body').tooltip({
            selector : '.tooltipaware',
            delay : {
                show : 500
            }
        });
        // Enable date picking
        $('.datepickerinput').datepicker();
		
        ko.applyBindings(model);

        // load errors
        model.loadErrors();
        // load stats
        model.loadStats();
    });

})(jQuery, ko);
