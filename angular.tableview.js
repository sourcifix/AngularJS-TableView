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
          if ($scope.$eval($attributes.autoFocus) !== false) {
            var element = $element[0];
            $timeout(function () {
              $scope.$emit('focus', element);
              element.focus();
            });
          }
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
            $scope.tableview.rows = [];
            $scope.tableview.amount = 0;
            $scope.tableview.pages = 1;
            $scope.theme = '';

            $scope.tableview.limits = $scope.tableview.limits || [10, 25, 50, 100];

            var updateOptions = function updateOptions() {

              $scope.tableview.selection = $scope.tableview.selection || [];
              $scope.tableview.request = $scope.tableview.request || {};
              $scope.tableview.request.page = $scope.tableview.request.page || 1;
              $scope.tableview.request.limit = $scope.tableview.request.limit || $scope.tableview.limits[0];
              $scope.tableview.request.order = $scope.tableview.request.order || [];
              $scope.tableview.request.like = $scope.tableview.request.like || {};

              $scope.theme = $scope.tableviewTheme || $scope.tableview.theme || $scope.$provider.theme || '';
              $element.attr('theme', $scope.theme);

              var on = 'addClass', off = 'removeClass';
              $element[/mobile|android|ip[ao]d|iphone/i.test(navigator.userAgent) ? on : off]('-mobile-');
              $element[$scope.tableview.scrollable ? on : off]('scrollable');
            };

            $scope.exec = function exec() {

              updateOptions();

              for (var key in $scope.tableview.columns) {

                if ($scope.tableview.columns[key].sortable) {
                  var v = $scope.getSort($scope.tableview.columns[key].field);
                  $scope.tableview.columns[key].sorting = (v && v.value ? v.value : void 0);
                } else {
                  delete $scope.tableview.columns[key].sorting;
                }

              }

              $scope.tableview.provider($scope.tableview.request, function provider(response) {

                $scope.tableview.rows = response.rows;
                $scope.tableview.amount = response.amount;
                $scope.tableview.pages = Math.ceil(response.amount / (response.limit || 1));
                $scope.tableview.request.page = response.page;
                $scope.tableview.request.limit = response.limit;

                var $node = $element[0], $scroller = $node.querySelector('.holder.scroller');

                if ($scroller && $scroller.parentNode === $node) {
                  $scroller.scrollTop = 0;
                }

              });
            };

            // Execution function sharing for external calls (filters extending logic)
            $scope.tableview.exec = $scope.exec;

            $scope.getColumnConfigByField = function getColumnConfigByField(field) {

              var columns = $scope.tableview.columns;

              for (var key in columns) {
                if (columns[key].field === field) {
                  return {index: key * 1, config: columns[key]};
                }
              }
            };

            $scope.getSort = function getSort(field) {

              var column = $scope.getColumnConfigByField(field);

              if (column && column.config.sortable) {

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
              }

            };

            $scope.switchSort = function switchSort(field) {

              var column = $scope.getColumnConfigByField(field);

              if (column && column.config.sortable) {
                var v = {field: field};
                var sorting = $scope.getSort(field);
                if (sorting === false) { // Sortable but not sorted
                  // set DESC
                  v.sorting = 'DESC';
                  if (!$scope.tableview.multisorting) {
                    $scope.tableview.request.order = [v];
                  } else {
                    $scope.tableview.request.order.push(v);
                  }
                } else if (sorting && 'DESC' === sorting.value) {
                  // set ASC
                  v.sorting = 'ASC';
                  if (!$scope.tableview.multisorting) {
                    $scope.tableview.request.order = [v];
                  } else {
                    $scope.tableview.request.order[sorting.index] = v;
                  }
                } else if (sorting && 'ASC' === sorting.value) {
                  // remove
                  if (!$scope.tableview.multisorting) {
                    $scope.tableview.request.order = [];
                  } else {
                    $scope.tableview.request.order.splice(sorting.index, 1);
                  }
                }
                $scope.exec();
              }
            };

            $scope.like = function like($index) {

              var field = $scope.tableview.columns[$index].field;
              if (!field || !$scope.tableview.columns[$index].filterable) {
                return;
              }

              if (isstr($scope.tableview.request.like[field]) && !$scope.tableview.request.like[field].trim()) {
                delete $scope.tableview.request.like[field];
              }

              $scope.tableview.request.page = 1;
              $scope.exec();

            };

            $scope.validate = function validate($index, $row, $mode) {

              var column = $scope.tableview.columns[$index];

              var valid = function valid() {
                return {message: '', status: true};
              };

              if (!column.editable || !isobj(column.editable)) {
                $mode.validation = valid();
                return true;
              } else if (!isfun(column.editable.validate)) {
                column.editable.validate = valid;
              }

              var result = column.editable.validate(column, $row, column.field, $mode.value);
              if (isbln(result)) {
                result = result ? valid() : {message: '', status: false};
              }

              result = (result && isobj(result) ? result : {});
              result.status = !!result.status;
              result.message = isstr(result.message) ? result.message : '';
              $mode.validation = result;

              return result.status;
            };

            $scope.edition = function edition($index, $row, $mode) {

              var column = $scope.tableview.columns[$index];
              var validation = $scope.validate($index, $row, $mode);
              var changed = !!($mode.value !== $row[column.field]);

              if (column.editable && validation) {
                $row[column.field] = $mode.value;
              } else {
                $mode.value = $row[column.field];
              }

              if (validation && changed && isobj(column.editable) && isfun(column.editable.change)) {
                column.editable.change(column, $row, column.field, $row[column.field]);
              }

              $mode.edition = false;
              $mode.validation = {message: '', status: true};

              return true;

            };

            $scope.next = function next() {
              $scope.tableview.request.page += 1;
              $scope.exec();
            };

            $scope.prev = function prev() {
              $scope.tableview.request.page -= 1;
              $scope.exec();
            };

            $scope.limit = function limit() {
              $scope.tableview.request.page = 1;
              $scope.tableview.request.limit *= 1;
              $scope.exec();
            };

            $scope.getRowSelectionIndex = function getRowSelectionIndex($row) {
              if (
                isstr($scope.tableview.selectableBy)
                ||
                !$scope.tableview.selectableBy.trim().length
                ||
                isund($row[$scope.tableview.selectableBy])
              ) {
                return;
              }

              var key = $scope.tableview.selectableBy;
              var val = $row[$scope.tableview.selectableBy];

              for (var i = 0; i < $scope.tableview.selection.length; i += 1) {
                if ($scope.tableview.selection[i][key] == val) {
                  return i;
                }
              }

              return -1;

            };

            $scope.switchRowSelection = function switchRowSelection($row, sign) {

              var index = $scope.getRowSelectionIndex($row);
              if (!isnum(index)) {
                return;
              }

              if (isbln(sign)) {
                if (index < 0 && sign) {
                  $scope.tableview.selection.push(angular.copy($row));
                } else if (index >= 0 && !sign) {
                  $scope.tableview.selection.splice(index, 1);
                }
              } else {
                if (index < 0) {
                  $scope.tableview.selection.push(angular.copy($row));
                } else {
                  $scope.tableview.selection.splice(index, 1);
                }
              }

            };

            $scope.isRowSelected = function isRowSelected($row) {
              var i = $scope.getRowSelectionIndex($row);
              return !!(isnum(i) && 0 <= i);
            };

            $scope.isRowsSelected = function isRowsSelected() {
              var $rows = $scope.tableview.rows.slice(0, $scope.tableview.request.limit);
              if (!$rows.length || !$scope.tableview.selection.length) {
                return false;
              }
              for (var i = 0; i < $rows.length; i += 1) {
                if (!$scope.isRowSelected($rows[i])) {
                  return false;
                }
              }
              return true;
            };

            $scope.onSelectPageRows = function onSelectPageRows($event) {
              var sign = $event.target.checked;
              var $rows = $scope.tableview.rows.slice(0, $scope.tableview.request.limit);
              for (var i = 0; i < $rows.length; i += 1) {
                $scope.switchRowSelection($rows[i], sign);
              }
            };

            $scope.themeTemplateName = function themeTemplateName(name) {
              if ($scope.theme && name) {
                name = ['tableview', $scope.theme, name].join('.');
                return (isstr($templateCache.get(name)) ? name : void 0);
              }
            };

            $scope.defaultTemplateName = function defaultTemplateName(name) {
              return ['tableview', name].join('.');
            };

            $scope.templateName = function templateName(name, $index) {

              // column.template
              // options.template
              // provider.template
              // theme.template
              // default

              var $0 = (isdef($index) && $scope.tableview.columns[$index] && $scope.tableview.columns[$index].template ? $scope.tableview.columns[$index].template : {});
              var $1 = ($scope.tableview.template && isobj($scope.tableview.template) ? $scope.tableview.template : {});
              var $2 = ($scope.$provider.template && isobj($scope.$provider.template) ? $scope.$provider.template : {});
              var tpl = $0[name] || $1[name] || $2[name] || $scope.themeTemplateName(name) || $scope.defaultTemplateName(name);

              return (isstr($templateCache.get(tpl)) ? tpl : void 0);

            };

            $scope.exec();

          };
        }
      };
    }
  );

  return angular.module('tableview');

}));
