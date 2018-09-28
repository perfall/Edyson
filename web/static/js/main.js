$(document).ready(function() {

    ///////////////////////////////////////////
    // Create plot, draw points and add zoom //
    ///////////////////////////////////////////


    var n = 15; // number of points
    var max = 100; // maximum of x and y

    // Radius of floating circle (cursor), also used in stroke-width of points
    var floatingCircleRadius = 100;

    // Algorithm used
    var alg = "tsne";

    // Used to allow export
    var labeled = false;

    var shiftDown = false;
    var categoryColor = "black"; // Start color of floating circle

    // dimensions and margins
    var svg = d3.select("svg")
    width = $("svg").width();
    height = $("svg").height();
    var margin = {
        top: (0 * width),
        right: (0 * width),
        bottom: (0 * width),
        left: (0 * width)
    };

    // create scale objects
    var xScale = d3.scaleLinear()
        .domain([-max, max])
        .range([0, width]);
    var yScale = d3.scaleLinear()
        .domain([-max, max])
        .range([height, 0]);

    // Declare these as identical for now, will be changed
    var new_xScale = xScale;
    var new_yScale = yScale;

    // Pan and zoom
    var zoom = d3.zoom()
        .scaleExtent([.1, 20])
        .extent([
            [0, 0],
            [width, height]
        ])
        .on("zoom", zoomed);

    // Add rect, container of points
    svg.append("rect")
        .attr("width", $("svg").width())
        .attr("height", $("svg").height())
        .style("fill", "none")
        .style("pointer-events", "all")
        .style("stroke-width", 4)
        .style("stroke", "black")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .classed("plot", true)

    // Append g-element to svg
    var points_g = svg.append("g")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr("clip-path", "url(#clip)")
        .classed("points_g", true);

    // Draw points, start random and change to tsne for visualisation
    drawPoints()
    drawBars()
    changeAlgorithm()

    function drawPoints() {
        // Draws points based on data provided by python
        points = points_g.selectAll("circle").data(data);
        points = points.enter().append("circle")
            .classed("dot", true) // class = .dot
            .classed("plot", true) // class = .plot
            .attr('cx', function(d) {
                //return xScale(d.tsneX)}
                return xScale(Math.random()*200-100)
            }) // x
            .attr('cy', function(d) {
                //return yScale(d.tsneY)
                return yScale(Math.random()*200-100)
            }) // y
            .attr('r', 12) // radius
            .attr('id', function(d) {
                return "p" + d.id
            }) // id
            .attr('start', function(d) {
                return d.start
            }) // starttime of point in given audiofile
            .style('fill', function(d) {
                return d.color
            }) // color of point
            .style('fill-opacity', 0.5) // a bit of transparency
            .style('stroke-width', floatingCircleRadius) // width of invisible radius, used to trigger hover
            .style('stroke-opacity', 0) // Hide frame of points

        // Add functionality for svg again, they were overridden during drawing of datapoints
        svg.style("pointer-events", "all")
        svg.call(zoom)
        svg.on("dblclick.zoom", null) // turn off double click zoom
    }

    function zoomed() {
        // create new scale ojects based on event
        //$("#floatingCircle").hide()
        new_xScale = d3.event.transform.rescaleX(xScale);
        new_yScale = d3.event.transform.rescaleY(yScale);
        points.data(data)
            .attr('cx', function(d) {
                if (alg=="tsne"){return new_xScale(d.tsneX)}
                else if (alg=="pca"){return new_xScale(d.pcaX)}
                else if (alg=="som"){return new_xScale(Math.random()*200-100)}
            })
            .attr('cy', function(d) {
                if (alg=="tsne"){return new_yScale(d.tsneY)}
                else if (alg=="pca"){return new_yScale(d.pcaY)}
                else if (alg=="som"){return new_yScale(Math.random()*200-100)}
            });
    }

    function drawBars() {
        // Draw timebars and assign hovers based on data provided by python
        data.forEach(function(point) {
            barId = "timeBarp" + point.id;
            $("#timeline").append($("<div id='" + barId + "'></div>"));
            $("#" + barId).addClass("timeBar");
                $("#" + barId).css({
                'position': 'absolute',
                'left': ((point.start / audioDuration * 100)) + '%',
                'background-color': categoryColor,
                'height': '100%',
                'opacity': '0.2',
                'width': segmentSize / audioDuration * 100 + '%',
                'border-radius': '50%',
                'cursor': 'pointer'
            });

            $("#" + barId).attr("tsneX", point.tsneX);
            $("#" + barId).attr("tsneY", point.tsneY);
            $("#" + barId).attr("pcaX", point.pcaX);
            $("#" + barId).attr("pcaY", point.pcaY);

            $("#" + barId).mouseenter(function() {
                $("#timeBarDuration").text(msToTime(point.start));
                $("#timeBarDuration").css({
                    'position': 'absolute',
                    'background-color': "black",
                    'color': "white",
                    'left': point.start / audioDuration * 100 + '%',
                    'bottom': "100%",
                    'opacity': '1'
                });
                $("#timeBarDuration").show()
            });

            $("#" + barId).mouseleave(function() {
                $("#timeBarDuration").hide()
            });

            $("#" + barId).click(function() {
                var audio = document.getElementById('audioBar');
                audio.currentTime = point.start / 1000;
                audio.play();
            });
        })
    }


    //////////////////
    // Mouse events // 
    //////////////////

    svg.on("mousemove", function() {
        var coords = d3.mouse(this);
        if (shiftDown) {
            categorize(coords[0], coords[1]);
        }
    })

    // $(".dot").mousemove(function(ev) {
        
    //     //$("#floatingCircle").show();
    //     drawFloatingCircle(ev);
    //     if (shiftDown) {
    //         categorize2(ev, this);
    //     }
    // });

    $(".plot").mousemove(function(ev) {
        //$("#floatingCircle").show();
        drawFloatingCircle(ev);
    });

    $(".plot").mouseenter(function() {
        $('#floatingCircle').css({
            'visibility': '' + 'visible'
        });
    });

    $(".plot").mouseleave(function() {
        $('#floatingCircle').css({
            'visibility': '' + 'hidden'
        });
    });


    ////////////////
    // Key events // 
    ////////////////

    $(document).keydown(function(ev) {
        if (ev.shiftKey) {
            shiftDown = true;
        } else {
            if (ev.keyCode == 49) {
                categoryColor = "blue";
            } else if (ev.keyCode == 50) {
                categoryColor = "green";
            } else if (ev.keyCode == 51) {
                categoryColor = "yellow";
            } else if (ev.keyCode == 52) {
                categoryColor = "red";
            }
            drawFloatingCircle(ev);
        }
    });

    $(document).keyup(function(ev) {
        if (shiftDown) {
            shiftDown = false;
        }
    });


    ////////////
    // Clicks // 
    ////////////

    // Color points on click
    // $(".dot").click(function(ev) {
    //     categorize(ev);
    // });

    svg.on("click", function() {
        var coords = d3.mouse(this);
        categorize(coords[0], coords[1]);
    })

    // Change color of floating circle
    $("#buttonGroup1 button").on("click", function() {
        value = this.value;
        categoryColor = value;
    });

    // Change algorithm, and therefor coords
    $("#buttonGroup2 button").on("click", function() {
        alg = this.value;
        changeAlgorithm();
    });

    $("#buttonGroup3 button").on("click", function() {
        floatingCircleRadius = this.value;
        var circle = svg.selectAll("circle");
        circle.style('stroke-width', floatingCircleRadius);
    });

    $("#buttonGroup4 button").on("click", function() {
        arrayToCSV();
    });

    // Play audio
    $("#playButton").on("click", function() {
        $("#audioBar").trigger('play');
    });

    // Pause audio
    $("#pauseButton").on("click", function() {
        $("#audioBar").trigger('pause');
    });

    /////////////////////
    // Misc. functions // 
    /////////////////////

    // function categorize(ev) {
    //     // Changes color of points and bars
    //     if (categoryColor!=="black") {
    //         labeled = true;
    //         pointList = getPointsUnderCursor(ev);
    //         pointList.forEach(function(point) {
    //             p = d3.select("#" + point.id)
    //             p.style('fill', categoryColor)
    //             p.style('color', categoryColor)

    //             $("#timeBar" + point.id).css({
    //                 'background-color': categoryColor
    //             });
    //         });
    //     }
    // }

    function categorize(x, y) {
        // Changes color of points and bars
        if (categoryColor!=="black") {
            labeled = true;
            if (alg=="tsne") {
                d3.selectAll("circle")
                    .filter(function(d) {return Math.abs(new_xScale(d.tsneX)-x) < floatingCircleRadius/2
                                              & Math.abs(new_yScale(d.tsneY)-y) < floatingCircleRadius/2})
                    .style('fill', categoryColor)

                d3.selectAll(".timeBar")
                    .filter(function(d) {return Math.abs(new_xScale(d3.select(this).attr("tsnex"))-x) < floatingCircleRadius/2
                                              & Math.abs(new_yScale(d3.select(this).attr("tsney"))-y) < floatingCircleRadius/2})
                    .style('background-color', categoryColor)
            }
            else if (alg=="pca") {
                d3.selectAll("circle")
                    .filter(function(d) {return Math.abs(new_xScale(d.pcaX)-x) < floatingCircleRadius/2
                                              & Math.abs(new_yScale(d.pcaY)-y) < floatingCircleRadius/2})
                    .style('fill', categoryColor)

                d3.selectAll(".timeBar")
                    .filter(function(d) {return Math.abs(new_xScale(d3.select(this).attr("pcax"))-x) < floatingCircleRadius/2
                                              & Math.abs(new_yScale(d3.select(this).attr("pcay"))-y) < floatingCircleRadius/2})
                    .style('background-color', categoryColor)
            }
        }
    }

    function getPointsUnderCursor(ev) {
        // Returns list of every circle-element under floating circle
        var x = ev.clientX;
        var y = ev.clientY;
        var pointList = [];
        elementMouseIsOver = document.elementFromPoint(x, y);

        while (elementMouseIsOver.tagName !== 'rect') {
            pointList.push(elementMouseIsOver);
            elementMouseIsOver.style.pointerEvents = 'none';
            elementMouseIsOver = document.elementFromPoint(x, y);
        }

        // Now clean it up
        var i = 0,
            il = pointList.length;

        // pointerEvents is reseted after a short pause, to avoid repeated processing of elements
        setTimeout(function() {
            for (; i < il; i += 1) {
                pointList[i].style.pointerEvents = '';
            }
        }, 2000);
        
        svg.style("pointer-events", "all")
        return pointList
    }

    function getPointsUnderCursor2(ev) {
        // Returns list of every circle-element under floating circle
        var x = ev.clientX;
        var y = ev.clientY;
        var pointList = [];
        console.log("coloring")

        coordinates = d3.mouse(ev);
        var x = coordinates[0];
        var y = coordinates[1];
        console.log(x)
        console.log(y)

        points = d3.selectAll("circle")
            .filter(function(d) {return d.tsneX > 0 & d.tsneY > 0 })
            .style('fill', "purple")
    }

    function drawFloatingCircle(ev) {
        // Draws floating circle
        $('#floatingCircle').css({
            'left': '' + ev.pageX - (floatingCircleRadius / 2) + 'px',
            'top': '' + ev.pageY - (floatingCircleRadius / 2) + 'px',
            'width': '' + floatingCircleRadius + 'px',
            'height': '' + floatingCircleRadius + 'px',
            'background-color': categoryColor
        });
    }

    function msToTime(ms) {
        // Converts milliseconds to duration, min:sec:ms
        var minutes = Math.floor((ms / (60 * 1000)) % 60).toString();
        var seconds = Math.floor((ms / 1000) % 60).toString();
        var milliseconds = (ms % 1000).toString();

        if (minutes.length == 1) {
            minutes = "0" + minutes;
        }
        if (seconds.length == 1) {
            seconds = "0" + seconds;
        }
        if (milliseconds.length == 1) {
            milliseconds = "00" + milliseconds;
        } else if (milliseconds.length == 2) {
            milliseconds = "0" + milliseconds;
        }
        return minutes + ":" + seconds + "." + milliseconds;
    }

    function changeAlgorithm () {
        var circle = svg.selectAll("circle");
        circle.transition()
            .duration(3000)
            .attr('cx', function(d) {
                if (alg=="tsne"){return new_xScale(d.tsneX)}
                else if (alg=="pca"){return new_xScale(d.pcaX)}
                else if (alg=="som"){return new_xScale(Math.random()*200-100)}})
            .attr('cy', function(d) {
                if (alg=="tsne"){return new_yScale(d.tsneY)}
                else if (alg=="pca"){return new_yScale(d.pcaY)}
                else if (alg=="som"){return new_yScale(Math.random()*200-100)}})
    }

    function arrayToCSV () {
        if (!labeled) {
            alert("Can't export, there are no labels")
        }
        else {
            twoDiArray = [["id", "startTime(ms)", "label"]]

            $("circle").each(function(){
                p = d3.select("#" + $(this).attr('id'))
                label = $("#"+p.style("fill")+"Label").val()
                if (label === undefined) {label = "none"}
                twoDiArray.push([p.attr('id'), p.attr('start'), label])
            })

            var csvRows = [];
            for (var i = 0; i < twoDiArray.length; ++i) {
                csvRows.push(twoDiArray[i].join(','));
            }

            var csvString = csvRows.join('\r\n');
            var a = document.createElement('a');
            a.href = 'data:attachment/csv,' + csvString;
            a.target = '_blank';
            a.download = 'labels.csv';

            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    }
})