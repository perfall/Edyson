$(document).ready(function() {
  validate();
  $('input').on('click', validate);
});

function validate() {
  var radiosWithValues = 0;
  var radios = $('input[name^=radio]')
  

  radios.each(function(e) {
    if ($(this).is(":checked")) {
      radiosWithValues += 1;
    }
  });

  console.log(radiosWithValues);
  if (radiosWithValues == 4) {
    $("input[type=submit]").prop("disabled", false);
  } else {
    $("input[type=submit]").prop("disabled", true);
  }
}