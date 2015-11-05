'use strict';
/* global $, canvasSupportApp, getTermArray, _, getCurrentTerm, errorDisplay, generateCurrentTimestamp, angular, validateEmailAddress */

/* TERMS CONTROLLER */
canvasSupportApp.controller('termsController', ['Courses', '$rootScope', '$scope', '$http', function (Courses, $rootScope, $scope, $http) {
  //void the currently selected term
  $scope.selectedTerm = null;
  //reset term scope
  $scope.terms = [];
  var termsUrl ='manager/api/v1/accounts/1/terms?per_page=4000&_=' + generateCurrentTimestamp();
  $http.get(termsUrl).success(function (data) {
    if(data.enrollment_terms){
      $scope.terms = data.enrollment_terms;

      /*TODO: there has to be a better way of getting
      the current term*/

      $scope.$parent.currentTerm =  getCurrentTerm(data.enrollment_terms);
    }
    else {
      errorDisplay(termsUrl,status,'Unable to get terms data');  
    }
  }).error(function () {
    errorDisplay(termsUrl,status,'Unable to get terms data');
  });

  //user selects a term from the dropdown that has been 
  //populated by $scope.terms 
  $scope.getTerm = function (termId, termName, termCanvasId) {
    $scope.$parent.currentTerm.currentTermName = termName;
    $scope.$parent.currentTerm.currentTermId = termId;
    $scope.$parent.currentTerm.currentTermCanvasId = termCanvasId;
    $('.canvasTermIdforjQuery').text(termCanvasId);
    $('.canvasTermNameforjQuery').text(termName);
  };

}]);


//COURSES CONTROLLER
canvasSupportApp.controller('coursesController', ['Courses', 'Sections', '$rootScope', '$scope', '$timeout', 'SectionSet', function (Courses, Sections, $rootScope, $scope, $timeout, SectionSet) {

    var uniqname = 'instx';
    $scope.uniqname = 'instx';
    
    var mini='/manager/api/v1/courses?as_user_id=sis_login_id:' +uniqname+ '&per_page=200&published=true&with_enrollments=true&enrollment_type=teacher&_='+ generateCurrentTimestamp();
    var url = '/canvasCourseManager'+mini;
    
    $scope.loadingLookUpCourses = true;

    Courses.getCourses(url).then(function (result) {

      if (result.data.errors) {
        // the call to CAPI has returned a json with an error node
        // various error flags in the scope  that do things in the UI
        $scope.success = false;
        $scope.error = true;
        $scope.instructions = false;
        $scope.loadingLookUpCourses = false;
      }
      else {
        if(result.errors){
          // catch all error
          $scope.success = false;
          $scope.error = true;
          $scope.instructions = false;
          $scope.loadingLookUpCourses = false;
        }
        else {
          // all is well - add the courses to the scope, extract the terms represented in course data
          // change scope flags and get the root server from the courses feed (!)

          //TODO: the flags in the model that are doing UI things should be collected in an object - also 
          //there is some duplication - and some of them are not 
          //needed anymore since the uinqname is a given

          $scope.courses = result.data;
          $scope.termArray = getTermArray(result.data);
          $scope.error = false;
          $scope.success = true;
          $scope.instructions = true;
          $scope.errorLookup = false;
          $scope.loadingLookUpCourses = false;
          $scope.courses.mode ='moveSections';
          $rootScope.server = result.data[0].calendar.ics.split('/feed')[0];
          $rootScope.user.uniqname = uniqname;
        }
      }
    });
  
  // make the sections sortable drag and droppable the angular way
  $scope.sortableOptions = {
      placeholder: 'section',
      connectWith: '.sectionList',
      dropOnEmpty: true,
      start: function(event, ui) {
        ui.item.addClass('grabbing');
      },
      receive: function(event, ui) {
        ui.sender.closest('ul.sectionList').removeClass('dropTarget ');
        //var sourceCourseId =  ui.sender.closest('li.course').attr('data-course-id');
        //var sourceCoursePos = $scope.courses.indexOf(_.findWhere($scope.courses, {id: parseInt(sourceCourseId)}));
        //$scope.courses[sourceCoursePos].sectionsDirty = true;

        var targetCourseId =  ui.item.closest('li.course').attr('data-course-id');
        var targetCoursePos = $scope.courses.indexOf(_.findWhere($scope.courses, {id: parseInt(targetCourseId)}));

        //if no sections currently, get them
        if (!$scope.courses[targetCoursePos].sectionsShown) {
          var $getSectionsButton = ui.item.closest('li.course').find('a.getSections');
          //trigger .getSections button to fetch this courses sections
          angular.element($getSectionsButton).trigger('click');
        }
        // void the dirty status of all courses
        _.each($scope.courses, function(course){
          course.sectionsDirty = false;
        });  
        //make the current drop target dirty
        $scope.courses[targetCoursePos].sectionsShown = true;
        $scope.courses[targetCoursePos].sectionsDirty = true;
        //refresh UI
        $scope.$apply();
      //on drop, append the name of the source course
        var prevMovEl = ui.item.find('.status');
        if(prevMovEl.text() !==''){
          prevMovEl.next('span').show();
        }
        if(ui.sender.closest('.course').find('.section').length ===1){
          ui.sender.closest('.course').addClass('onlyOneSection');
        }
        if(ui.sender.closest('.course').find('.section').length ===0){
          ui.sender.closest('.course').addClass('noSections');
        }
        prevMovEl.text('Moved  from ' + ui.sender.closest('.course').find('.courseLink').text());
        $('li.course').removeClass('activeCourse');
        ui.item.closest('li.course').addClass('activeCourse');
      },
      stop: function( event, ui ) {
        ui.item.closest('ul.sectionList').removeClass('moveSections');
        //add some animation feedback to the move
        ui.item.css('background-color', '#FFFF9C')
          .animate({ backgroundColor: '#FFFFFF'}, 1500);
        ui.item.removeClass('grabbing');
      }
  };


 /*User clicks on Get Sections and the sections for that course
  gets added to the course scope*/
  $scope.getSections = function (courseId) {
    Sections.getSectionsForCourseId(courseId).then(function (data) {
      if (data) {
        //find the course object
        var coursePos = $scope.courses.indexOf(_.findWhere($scope.courses, {id: courseId}));
        //append a section object to the course scope
        $scope.courses[coursePos].sections = data.data;
        //sectionsShown = true hides the Get Sections link
        $scope.courses[coursePos].sectionsShown = true;
      } else {
        //deal with this
      }
    });
  };

  $scope.addUserModal = function(courseId){
    Sections.getSectionsForCourseId(courseId).then(function (data) {
      if (data) {
        //find the course object
        var coursePos = $scope.courses.indexOf(_.findWhere($scope.courses, {id: courseId}));
        //append a section object to the course scope
        $scope.courses[coursePos].sections = data.data;
        //sectionsShown = true hides the Get Sections link
        $scope.courses[coursePos].sectionsShown = true;
        var course = $scope.courses.indexOf(_.findWhere($scope.courses, {id: courseId}));
        SectionSet.setSectionSet($scope.courses[course]);
      } else {
        //deal with this
      }
    });
  };
  $scope.addUserMode = function() {
    $scope.courses.mode='addUser';
    _.each($scope.courses, function(course){
      course.sectionsDirty = false;
      course.sectionsShown = false;
      if(course.sections){
        delete course.sections;
      }
    });
  };
  $scope.moveSectionsMode = function() {
    $scope.courses.mode='moveSections';
    _.each($scope.courses, function(course){
      course.sectionsDirty = false;
      course.sectionShown = false;
      if(course.sections){
        delete course.sections;
      }    
    });
  };
}]);

/* SINGLE COURSE CONTROLLER */
canvasSupportApp.controller('courseController', ['Course', 'Courses', 'Sections', 'Friend', 'SectionSet', '$scope', '$rootScope', '$filter', function (Course, Courses, Sections, Friend, SectionSet, $scope, $rootScope, $filter) {
  //TODO: this URL will be constructed from the LIT launch parameters - hardcoded here
  $rootScope.contextCourseId = parseInt('20193');
  var courseUrl ='manager/api/v1/courses/20193?include[]=sections&_=' + generateCurrentTimestamp();
  Course.getCourse(courseUrl).then(function (result) {
    $scope.loadingSections = true;
    $scope.course = result.data;
    // ideally the ections would be returned above, if not we will need to get them here
    Sections.getSectionsForCourseId($scope.course.id).then(function (result) {
      $scope.loadingSections = false;
      $scope.course.sections =_.sortBy(result.data, 'name');
    });    
  });

  /*
  TODO: MPATH dummy data now 
  adds to the scope a list if sections (by sis_section_id) that the current user can perform actions on
  */
  var mPathwaysCoursesUrl = 'manager/mpathways/Instructors?instructor=bkg&termid=2060';

  //var mPathwaysCoursesUrl = 'assets-lti/data/mpathwaysdata.json';
  Course.getMPathwaysCourses(mPathwaysCoursesUrl).then(function (result) {
    $scope.mpath_courses = result;
  });


  //hardcoded here to match same user and term as MPathways data
  var uniqname = 'bkg';

  $scope.getCoursesForTerm = function() {
    $scope.loadingOtherCourses = true;
    var coursesUrl='/canvasCourseManager/manager/api/v1/courses?as_user_id=sis_login_id:' +uniqname+ '&per_page=200&published=true&with_enrollments=true&enrollment_type=teacher&_='+ generateCurrentTimestamp();
    Courses.getCourses(coursesUrl).then(function (result) {
      $scope.loadingOtherCourses = false;
      $scope.course.addingSections = true;
      // this is not optimal - ideally we should be requesting just this terms' courses, not all of them and then 
      // filtering them
      //$scope.courses = _.where(result.data, {enrollment_term_id:  $scope.course.enrollment_term_id});
      //TODO: hardwired term here tfor the same term we have an MPATH sample for
      $scope.courses = _.where(result.data, {enrollment_term_id:  43});
    });    
  };

  $scope.getSections = function (courseId) {
    //find the course object
    var coursePos = $scope.courses.indexOf(_.findWhere($scope.courses, {id: courseId}));
    $scope.courses[coursePos].loadingOtherSections = true;
    Sections.getSectionsForCourseId(courseId).then(function (data) {
      if (data) {
        //append a section object to the course scope
        $scope.courses[coursePos].sections = _.sortBy(filterOutSections(data.data,$scope.mpath_courses), 'name');

        $scope.courses[coursePos].loadingOtherSections = false;
        //sectionsShown = true hides the Get Sections link
        $scope.courses[coursePos].sectionsShown = true;
      } else {
        //deal with this
      }
    });
  };

  $scope.returnToCourse = function (section, thisindex) {
    var sourceCoursePos = $scope.courses.indexOf(_.findWhere($scope.courses, {id: section.course_id}));
    // move an added section back to the course it came from
    $scope.courses[sourceCoursePos].sections.push(section);
    // remove it from the target course section list
    $scope.course.sections.splice(thisindex, 1);
    // set dirty to true if any added sections remain
    $scope.course.dirty=false;
    _.each($scope.course.sections, function(section){
      if(section.course_id !== $scope.course.id){
        $scope.course.dirty=true;
      }
    });
  };

  $scope.appendToCourse = function (section, thisindex) {
    //find hte source course object
    var sourceCoursePos = $scope.courses.indexOf(_.findWhere($scope.courses, {id: section.course_id}));
    // add new section to the target course
    $scope.course.sections.push(section);
    // set dirty to true
    $scope.course.dirty=true;
    // remove section from source course
    $scope.courses[sourceCoursePos].sections.splice(thisindex, 1);
  };

  $scope.cancelAddSections = function () {
    // remove all added sections
    $scope.course.sections = $filter('filter')($scope.course.sections, {course_id: $scope.course.id});
    // set dirty and addingSections to false (controls display and disabled of buttons)
    $scope.course.dirty=false;
    $scope.course.addingSections = false;
    // prune the source courses from the model
    $scope.courses = [];
  };
  
  $scope.addUserModal = function(){
    // use a service to pass context course model to the friends controller
    SectionSet.setSectionSet($scope.course);
  };

}]);

/* FRIEND PANEL CONTROLLER */
canvasSupportApp.controller('addUserController', ['Friend', '$scope', '$rootScope', 'SectionSet', function (Friend, $scope, $rootScope, SectionSet) {
  // listen for changes triggered by the service to load course context
  $scope.$on('courseSetChanged', function(event, sectionSet) {
      $scope.coursemodal = sectionSet[0];
  });
  
  //change handler for section checkboxes - calculates if any checkbox is checked and updates
  // a variable used to enable the 'Add Friend' button
  $scope.sectionSelectedQuery = function () {
    if(_.where($scope.coursemodal.sections,{selected: true}).length > 0){

      $scope.coursemodal.sectionSelected = true;
    }
    else {
      $scope.coursemodal.sectionSelected = false;
    }
  };

  // handler for 'Add Friend' (the first one), if account exists in Canvas, add to sections, if not 
  // present a form to create

  $scope.lookUpCanvasFriendClick = function () {
    $scope.friend = {};
    $scope.coursemodal.loadingLookupFriend = true;
    var friendId = $.trim($scope.coursemodal.friendEmailAddress);
    if(validateEmailAddress(friendId)){
      $scope.failedValidation = false;
      Friend.lookUpCanvasFriend(friendId).then(function (data) {
        if (data.data.length ===1 && data.data[0].sis_user_id === friendId) {
          // user exists - set data to Canvas response
          // and call function to add to sections
          $scope.friend = data.data[0];
          $scope.userExists = true;
          $scope.addUserToSectionsClick();
        } else {
          // not an existing user - present interface to add
          $scope.newUser = true;
        }
        $scope.coursemodal.loadingLookupFriend = false;
      });
    }
    else {
      $scope.coursemodal.loadingLookupFriend = false;
      $scope.failedValidation = true;
    }
  };

  // handler for 'Add Friend' (the second one) - calls Friends endpoint (that does the call to
  // the external Friend service) - if successful the account is also created in Canvas and 
  // the user gets added to the selected sections

  $scope.createFriendClick = function () {

    var friendEmailAddress = $.trim($scope.coursemodal.friendEmailAddress);
    var friendNameFirst = $.trim($scope.coursemodal.friendNameFirst);//$('#friendNameFirst').val();
    var friendNameLast = $.trim($scope.coursemodal.friendNameLast);//$('#friendNameLast').val();
    var notifyInstructor = 'false';

    if(validateEmailAddress(friendEmailAddress) && friendNameFirst !=='' && friendNameLast !==''){
      $scope.failedValidation = false;
      //will need to grab this from the LTI context and put it in the rootScope
      var requestorEmail = 'instx@umich.edu'; // hardwired for now
      $scope.coursemodal.loadingCreateUser = true;

      Friend.doFriendAccount(friendEmailAddress, requestorEmail, notifyInstructor).then(function (data) {
        if (data.data.message === 'created' || data.data.message === 'exists') {
          $scope.friend_account = data.data;
          $scope.newUserFound=true;
          $scope.friendDone=true;
          
          Friend.createCanvasFriend(friendEmailAddress,friendNameFirst, friendNameLast).then(function (data) {
            if (data.data.sis_user_id === friendEmailAddress) {
              // here we add the person to the scope and then use another function to add them to the sites
              $scope.newUser=false;
              $scope.newUserFound=true;
              $scope.friend = data.data;
              $scope.canvasDone=true;
              $scope.addUserToSectionsClick();
            } else {
              // TODO: report error
            }
            $scope.coursemodal.loadingCreateUser = false;
          });
          $scope.userAvailable = true;
          $scope.done = true;
        } else {
          $scope.coursemodal.loadingCreateUser = false;
          $scope.friend_account = data.data;
          $scope.newUserFail=true;
          // TODO: report error
        }
      });
    }
    else {
      $scope.failedValidation = true;
    }
  };

  // handler to reset the state in the workflow 
  // and a allow the user to add another

  $scope.addAnother = function() {
    $scope.friend = false;
    $scope.userExists = false;
    $scope.newUser = false;
    $scope.newUserFound = false;
    $scope.addSuccess = false;
    $scope.coursemodal.friendEmailAddress ='';
    $scope.coursemodal.friendNameFirst ='';
    $scope.coursemodal.friendNameLast ='';

    $scope.resetable = false;
    for(var e in $scope.coursemodal.sections) {
      $scope.coursemodal.sections[e].selected = false;
    }
    $scope.coursemodal.sectionSelected = false; 
  };

  // function used by the event handlers attached to the two 
  // 'Add Friend' buttons. It adds the user to the selected sections

  $scope.addUserToSectionsClick = function () {
    var checkedSections = $('.coursePanel input:checked').length;
    var sectNumber = 0;
    var successes = [];
    $('#successFullSections').empty();
    for(var e in $scope.coursemodal.sections) {
      if ($scope.coursemodal.sections[e].selected) {
        sectNumber = sectNumber + 1;
        var sectionId = $scope.coursemodal.sections[e].id;
        var sectionName = $scope.coursemodal.sections[e].name;
        var thisSectionRole = $('li#' +sectionId).find('select').val();
        
        var url = '/canvasCourseManager/manager/api/v1/sections/' + sectionId + '/enrollments?enrollment[user_id]=' + $scope.friend.id + '&enrollment[enrollment_state]=active&enrollment[type]=' + thisSectionRole;
        
        Friend.addFriendToSection(url).then(function (data) {
          if (data.errors) {
            // TODO: report error
          } else {
            if(data.data.course_id) {
              $scope.addSuccess = true;
              if (checkedSections === sectNumber){
                $scope.newUser = false;
                $scope.none = false;
                $scope.userAvailable  = false;
                $scope.coursemodal.resetable = true;
              }
            }
          }
        });
        $scope.addSuccess = true;
        successes.push(sectionName)
      }
      $scope.successes = successes
    }
  };

}]);