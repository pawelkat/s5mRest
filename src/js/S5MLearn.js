
var currentIdeaChanged = false;
var currentUUID;
var stack_bottomright = {"dir1": "up", "dir2": "left", "firstpos1": 15, "firstpos2": 15};
var mModel;
$(document).ready(function() {
		window.onerror = alert;
		
		var container = jQuery('#container'),
		isTouch = false,
		renderImages = false,
		mapModel = new MAPJS.MapModel(MAPJS.KineticMediator.layoutCalculator, ['A brilliant idea...', 'A cunning plan...', 'We\'ll be famous...'], ['hoo har']);
		container.mapWidget(console,mapModel, isTouch, renderImages);
		
		mModel=mapModel;
		//making map content read-only
		mModel.setEditingEnabled(false);
		//initialize buttons
		var button = $("#grade-noidea").button();
		button.click(
			function(){
				app.gradeItem(1);
			}
		);	
		button = $("#grade-poor").button();
		button.click(
			function(){
				app.gradeItem(2);
			}
		);
		button = $("#grade-ok").button();
		button.click(
			function(){
				app.gradeItem(3);
			}
		);
		button = $("#grade-good").button();
		button.click(
			function(){
				app.gradeItem(4);
			}
		);		
		button = $("#grade-perfect").button();
		button.click(
			function(){
				app.gradeItem(5);
			}
		);
		app.nextFlashcard();

});

app={
	itemEndpoint : "v1/resources/learn",
	nextFlashcard: function(){
		var json;
		$.ajax(
			{
				url: app.itemEndpoint,
				dataType: 'json',
				accepts: {
					text: "application/json"
				},
				async: false,
				success: function(bindings) {
					json = bindings.content;
					currentUUID = bindings.uuid;
				}
			} 
		);
		idea = MAPJS.content(json);
		mModel.setIdea(idea);
	},
	

	gradeItem: function(grade){
		$.ajax(
			{
				url: "v1/resources/learn?rs:uri=" + currentUUID + "&rs:grade=" + grade,
				dataType: 'json',
				type: 'Put',
				data: grade, 
				accepts: {
					text: "application/json"
				},
				async: false,
				success: function(data) {
					app.message(data.response);
					app.nextFlashcard();
				}
			} 
		);
	},
	
	onIdeaChanged: function(){
		currentIdeaChanged = true;
	},
	
	message: function(message) {
		new PNotify({
			text: message,
			shadow: true,
			hide: true,
			closer: true,
			opacity: .65,
			addclass: "stack-bottomright custom",
			stack: stack_bottomright
		});
	}
}		
