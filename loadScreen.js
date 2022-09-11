var loadLoop = ["Loading.", "Loading..", "Loading..."];
var loopInd = 0;
var ID;

$("#loadText").fadeTo(0,1);
ID = setInterval( function(){
  $( "#loadText" ).stop().html( loadLoop[loopInd] ).fadeTo(.5, 1, function(){
      loopInd++;
      //$( "#loadText" ).delay(50).fadeTo(500, 0 );
      if ( loopInd == 3 ) {
          loopInd = 0;
      };
  } );
}, 1000 );

export { ID }