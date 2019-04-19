/*
 AngularJS TableView v1.1.1
 (c) 2016 Max Chuhryaev <w3core@gmail.com> https://github.com/w3core/AngularJS-TableView
 License: MIT
*/

(function (root, factory) {
  if (module && module.exports) {
    // CommonJS
    if (!angular) {
      factory(angular);
    } else {
      factory(require('angular'));
    }
    module.exports = 'tableview';
  } else {
    // noinspection JSUnresolvedVariable
    if ('function' === typeof define && define.amd) { // eslint-disable-line angular/typecheck-function
      // AMD
      // noinspection JSUnresolvedFunction
      define(['angular'], factory);
    } else {
      // Global Variables
      factory(root.angular);
    }
  }
}(this, function factory(angular) {

  angular.module('tableview', []);

  angular.module('tableview').provider(
    '$tableView',
    function tableViewProvider() {

      var that = this;

      this.theme = null;
      // noinspection JSUnusedGlobalSymbols
      this.$get = function get$() {
        return that;
      };

    }
  ).directive(
    'tableviewAutofocus',
    function tableviewAutofocusDirective($timeout) {
      // noinspection JSUnusedGlobalSymbols
      return {

        restrict: 'A',

        link: function link($scope, $element, $attributes) {

          if (false === $scope.$eval($attributes.autoFocus)) {
            return;
          }

          var element = $element[0];
          $timeout(function () {
            $scope.$emit('focus', element);
            element.focus();
          });

        }

      };
    }
  ).directive(
    'tableview',
    function tableviewDirective($compile, $http, $templateCache, $tableView, $document) {

      // noinspection JSDeprecatedSymbols
      var
        isobj = angular.isObject, isbln = angular.isBoolean, isfun = angular.isFunction,
        isund = angular.isUndefined, isdef = angular.isDefined,
        isstr = angular.isString, isnum = angular.isNumber
      ;

      var eq = function eq(value1, value2) {
        return ('' + value1) === ('' + value2);
      };

      var MODULE_NAME = 'angular.tableview';

      var modurl = function moduleUrl() {
        var js = $document.querySelector('script[src*=\'' + MODULE_NAME + '\']');
        return js ? js.src.replace(/[^\/]*$/, '') : void 0;
      };

      var MODULE_TPL = modurl() + MODULE_NAME + '.html';

      // noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
      return {

        restrict: 'A',

        scope: {
          tableview:      '=',
          tableviewTheme: '='
        },

        templateUrl: function templateUrl($element, $attr) {
          return $attr.tableviewTemplateUrl || $tableView.templateUrl || MODULE_TPL;
        },

        compile: function compile($element, $attr) {

          // noinspection JSUnusedLocalSymbols
          return function link($scope, $element, $attr) {

            $scope.$provider = $tableView;
            $scope.$scope = $scope.$parent;
            $scope.Math = Math;
            $scope.theme = '';
            $scope.tableview.rows = [];
            $scope.tableview.amount = 0;
            $scope.tableview.pages = 1;
            $scope.tableview.limits = $scope.tableview.limits || [10, 25, 50, 100];

            var updateOptions = (function updateOptions() {

              var tv = $scope.tableview;

              tv.selection = tv.selection || [];
              tv.request = tv.request || {};
              tv.request.page = tv.request.page || 1;
              tv.request.limit = tv.request.limit || tv.limits[0];
              tv.request.order = tv.request.order || [];
              tv.request.like = tv.request.like || {};

              $scope.theme = $scope.tableviewTheme || tv.theme || $scope.$provider.theme || '';
              $element.attr('theme', $scope.theme);

              var on = 'addClass', off = 'removeClass';
              $element[/mobile|android|ip[ao]d|iphone/i.test(navigator.userAgent) ? on : off]('-mobile-');
              $element[tv.scrollable ? on : off]('scrollable');
            });

            $scope.exec = (function exec() {

              updateOptions();

              var tv = $scope.tableview, cols = tv.columns;

              Object.keys(cols).forEach(function forEachKey(key) {

                var col = cols[key];

                if (col.sortable) {
                  var info = $scope.sortOf(col.field);
                  col.sorting = (info && info.value ? info.value : void 0);
                } else {
                  delete col.sorting;
                }

              });

              tv.provider(tv.request, function provider(response) {

                var tv = $scope.tableview;

                tv.rows = response.rows;
                tv.amount = response.amount;
                tv.pages = Math.ceil(response.amount / (response.limit || 1));
                tv.request.page = response.page;
                tv.request.limit = response.limit;

                var $node = $element[0], $scroller = $node.querySelector('.holder.scroller');

                if ($scroller && $scroller.parentNode === $node) {
                  $scroller.scrollTop = 0;
                }

              });
            });

            // Execution function sharing for external calls (filters extending logic)
            $scope.tableview.exec = $scope.exec;

            $scope.fieldInfo = (function fieldInfo(field) {

              return $scope.tableview.columns.reduce(function reducer(result, config, index) {

                return result ? result : (field === config.field ? {index: index, config: config} : void 0);

              }, void 0);


            });

            $scope.sortOf = (function sortOf(field) {

              var info = $scope.fieldInfo(field);

              if (!info || !info.config.sortable) {
                return;
              }

              var r = $scope.tableview.request.order;

              for (var i = 0; i < r.length; i += 1) {
                if (r[i] && r[i].field && r[i].field === field) {
                  return {
                    index: i,
                    value: r[i].sorting
                  };
                }
              }

              return false;

            });

            $scope.switchSort = (function switchSort(field) {

              var col = $scope.fieldInfo(field);

              if (!col || !col.config.sortable) {
                return;
              }

              var info = ({field: field}), sorting = $scope.sortOf(field), tv = $scope.tableview, req = tv.request;

              if (false === sorting) { // Sortable but not sorted
                info.sorting = 'DESC';
                (tv.multisorting ? req.order.push(info) : req.order = [info]);
              } else if (sorting && 'DESC' === sorting.value) {
                info.sorting = 'ASC';
                (tv.multisorting ? req.order[sorting.index] = info : req.order = [info]);
              } else if (sorting && 'ASC' === sorting.value) {
                (tv.multisorting ? req.order.splice(sorting.index, 1) : req.order = []);
              }

              $scope.exec();

            });

            $scope.like = (function like($index) {

              var tv = $scope.tableview, field = tv.columns[$index].field, lk = tv.request.like;

              if (!field || !tv.columns[$index].filterable) {
                return;
              }

              if (isstr(lk[field]) && !lk[field].trim()) {
                delete lk[field];
              }

              tv.request.page = 1;
              $scope.exec();

            });

            $scope.validate = (function validate($index, $row, $mode) {

              var col = $scope.tableview.columns[$index];

              var v = function validation() {
                return ({message: '', status: true});
              };

              if (!col.editable || !isobj(col.editable)) {
                $mode.validation = v();
                return true;
              } else if (!isfun(col.editable.validate)) {
                col.editable.validate = v;
              }

              var result = col.editable.validate(col, $row, col.field, $mode.value);
              if (isbln(result)) {
                result = result ? v() : ({message: '', status: false});
              }

              result = (result && isobj(result) ? result : {});
              result.status = !!result.status;
              result.message = isstr(result.message) ? result.message : '';
              $mode.validation = result;

              return result.status;
            });

            $scope.edition = (function edition($index, $row, $mode) {

              var col = $scope.tableview.columns[$index];
              var valid = $scope.validate($index, $row, $mode);
              var dirty = !!($mode.value !== $row[col.field]);

              if (col.editable && valid) {
                $row[col.field] = $mode.value;
              } else {
                $mode.value = $row[col.field];
              }

              if (valid && dirty && isobj(col.editable) && isfun(col.editable.change)) {
                col.editable.change(col, $row, col.field, $row[col.field]);
              }

              $mode.edition = false;
              $mode.validation = ({message: '', status: true});

              return true;

            });

            $scope.next = (function next() {
              $scope.tableview.request.page += 1;
              $scope.exec();
            });

            $scope.prev = (function prev() {
              $scope.tableview.request.page -= 1;
              $scope.exec();
            });

            $scope.limit = (function limit() {
              $scope.tableview.request.page = 1;
              $scope.tableview.request.limit *= 1;
              $scope.exec();
            });

            $scope.selectedRowIndex = (function selectedRowIndex($row) {

              var tv = $scope.tableview;

              if (isstr(tv.selectableBy) || !tv.selectableBy.trim().length || isund($row[tv.selectableBy])) {
                return;
              }

              var key = tv.selectableBy, val = $row[tv.selectableBy];

              return tv.selection.findIndex(function findIndex(selection) {
                return eq(val, selection[key]);
              });

            });

            $scope.switchRowSelection = (function switchRowSelection($row, sign) {

              var index = $scope.selectedRowIndex($row);
              if (!isnum(index)) {
                return;
              }

              var selection = $scope.tableview.selection;

              if (isbln(sign)) {
                if (0 > index && sign) {
                  selection.push(angular.copy($row));
                } else if (0 <= index && !sign) {
                  selection.splice(index, 1);
                }
              } else {
                if (0 > index) {
                  selection.push(angular.copy($row));
                } else {
                  selection.splice(index, 1);
                }
              }

            });

            $scope.isRowSelected = (function isRowSelected($row) {
              var index = $scope.selectedRowIndex($row);
              return !!(isnum(index) && 0 <= index);
            });

            $scope.areRowsSelected = (function areRowsSelected() {

              var tv = $scope.tableview, $rows = tv.rows.slice(0, tv.request.limit);

              if (!$rows.length || !tv.selection.length) {
                return false;
              }

              for (var i = 0; i < $rows.length; i += 1) {
                if (!$scope.isRowSelected($rows[i])) {
                  return false;
                }
              }

              return true;
            });

            $scope.onSelectPageRows = (function onSelectPageRows($event) {

              var sign = $event.target.checked, tv = $scope.tableview, $rows = tv.rows.slice(0, tv.request.limit);

              for (var i = 0; i < $rows.length; i += 1) {
                $scope.switchRowSelection($rows[i], sign);
              }

            });

            $scope.themeTemplateName = (function themeTemplateName(name) {
              if ($scope.theme && name) {
                name = ['tableview', $scope.theme, name].join('.');
                return (isstr($templateCache.get(name)) ? name : void 0);
              }
            });

            $scope.defaultTemplateName = (function defaultTemplateName(name) {
              return ['tableview', name].join('.');
            });

            $scope.templateName = (function templateName(name, $index) {

              // column.template
              // options.template
              // provider.template
              // theme.template
              // default

              var tv = $scope.tableview, tvtpl = tv.template, prtpl = $scope.$provider.template;
              var cltpl = isdef($index) && tv.columns[$index] && tv.columns[$index].template;

              var $0 = (cltpl ? cltpl : {});
              var $1 = (tvtpl && isobj(tvtpl) ? tvtpl : {});
              var $2 = (prtpl && isobj(prtpl) ? prtpl : {});

              var tpl = $0[name] || $1[name] || $2[name] || $scope.themeTemplateName(name) || $scope.defaultTemplateName(name);

              return (isstr($templateCache.get(tpl)) ? tpl : void 0);

            });

            $scope.exec();

          };
        }
      };
    }
  );

  return angular.module('tableview');

}));
