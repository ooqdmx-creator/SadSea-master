

function caca6() {
	
const now = new Date().getTime();
const date = new Date ('march 1, 2022 00:00').getTime();
const date_voulu = date - now;
const day = Math.floor( date_voulu / (1000*60*60*24));
const hours = Math.floor(( date_voulu % (1000*60*60*24)) / (1000*60*60));
const minutes = Math.floor(( date_voulu % (1000*60*60))/(1000*60));
const seconds = Math.floor((date_voulu % (1000*60))/ 1000);

var date2 = minutes
var daaate = day + "j" + hours + "h" + minutes + "m" + seconds;
//heures
		

var url="https://www.sad-sea-mint.com/";

if (date_voulu <0)
{
	var paragraphe = document.getElementById("div5_timer");
	paragraphe.innerHTML="clique".link(URL);
}
else
{



		if (hours<10)
		{
			var paragraphe2 = document.getElementById("heures");
			paragraphe2.innerHTML="0"+hours;
		}
		else
		{
			var paragraphe2 = document.getElementById("heures");
			paragraphe2.innerHTML=hours;
		}
		//secondes
		if (seconds<10)
		{
			var paragraphe4 = document.getElementById("seconds");
			paragraphe4.innerHTML="0"+seconds;
		}
		else
		{
			var paragraphe4 = document.getElementById("seconds");
			paragraphe4.innerHTML=seconds+"";
		}
		//minutes
		if (minutes<10)
		{
			
		var paragraphe3 = document.getElementById("minutes");
			paragraphe3.innerHTML="0"+minutes;
		}
		else
		{
			
		var paragraphe3 = document.getElementById("minutes");
			paragraphe3.innerHTML=minutes;
		}
		//jours

		if (day<10)
		{
			var paragraphe = document.getElementById("div5_timer");

			paragraphe.innerHTML="0"+day;
		}
		else
		{
			var paragraphe = document.getElementById("div5_timer");

			paragraphe.innerHTML=day+"";
		}

}


}

setInterval(caca6, 1000);