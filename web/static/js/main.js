$(document).ready(function () {

    ///////////////////////////////////////////
    // Create plot, draw points and add zoom //
    ///////////////////////////////////////////


    var n = 15; // number of points
    var max = 100; // maximum of x and y

    // Radius of floating circle (cursor), also used in stroke-width of points
    var floatingCircleRadius = 100;
    var prevFloatingCircleRadius = 100; // temporary solution for centroid placement

    // Algorithm used
    var alg = "tsne";

    // Used to allow export
    var labeled = false;

    var shiftDown = false;
    var ctrlDown = false;
    var cDown = false;
    var categoryColor = "black"; // Start color of floating circle

    // Set variable for audio duration
    var currentClosestTime = 0;

    // Set variabel for graphPoints
    var graphPoints = "";

    // Set dict for centroids
    centroids = {};

    // dimensions and margins
    var map = d3.select("#map")
    width = $("#map").width();
    height = $("#map").height();
    var margin = {
        top: (0 * width),
        right: (0 * width),
        bottom: (0 * width),
        left: (0 * width)
    };

    // sequenceMap, i.e. timeline
    var sequenceMap = d3.select("#sequenceMap")
    var sequenceMapWidth = $("#sequenceMap").width();
    var sequenceMapHeight = $("#sequenceMap").height();

    // graphMap, i.e. second timeline
    var graphMap = d3.select("#graphMap")
    var graphMapWidth = $("#graphMap").width();
    var graphMapHeight = $("#graphMap").height();

    // create scale objects
    var xScale = d3.scaleLinear()
        .domain([-max, max])
        .range([0, width]);
    var yScale = d3.scaleLinear()
        .domain([-max, max])
        .range([height, 0]);

    // creat scale object for sequenceMap
    var xScaleSequence = d3.scaleLinear()
        .domain([0, max])
        .range([0, sequenceMapWidth]);

    // Declare these as identical for now, will be changed
    var new_xScale = xScale;
    var new_yScale = yScale;
    var new_xScaleSequence = xScaleSequence;

    // Define list of lockedColors
    var lockedColors = [];

    // Pan and zoom
    var zoom = d3.zoom()
        .scaleExtent([.1, 20])
        .extent([
            [0, 0],
            [width, height]
        ])
        .on("zoom", zoomed);

    // Pan and zoom
    var zoom2 = d3.zoom()
        .scaleExtent([1.0, 100])
        .extent([
            [0],
            [sequenceMapWidth]
        ])
        .on("zoom", zoomed2);

    // Add rect, container of points
    map.append("rect")
        .attr("width", $("#map").width())
        .attr("height", $("#map").height())
        .style("fill", "none")
        .style("pointer-events", "all")
        .style("stroke-width", 4)
        .style("stroke", "black")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .classed("plot", true)

    // Append g-element to map
    var points_g = map.append("g")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr("clip-path", "url(#clip)")
        .classed("points_g", true);

    sequenceMap.append("rect")
        .attr("width", sequenceMapWidth)
        .attr("height", $("#sequenceMap").height())
        .style("fill", "none")
        .style("pointer-events", "all")
        .style("stroke-width", 3)
        .style("stroke", "black")

    // Append g-element to sequenceMap
    var rects_g = sequenceMap.append("g")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr("clip-path", "url(#clip)")
        .classed("rects_g", true);

    graphMap.append("rect")
        .attr("id", "graphContainer")
        .attr("width", graphMapWidth)
        .attr("height", $("#graphMap").height())
        .style("fill", "none")
        .style("pointer-events", "all")
        .style("stroke-width", 3)
        .style("stroke", "black")


    // Sample data
    var newData = []
    for (var i = 0; i < data.length; ++i) {
        if (i % 10 == 0) {
            newData.push(data[i])
        }
    }

    // Draw points, start random and change to tsne for visualisation
    drawPoints()
    drawRects()
    changeAlgorithm()

    // set design of timeBar
    var timeBar = d3.select("#timeBar")
        .attr('x', function (d) {
            //return xScale(d.tsneX)}
            return xScaleSequence(0)
        }) // x
        .attr('y', "82.5%")
        .attr('rx', "50")
        .attr('ry', "50")
        .attr('width', 0.006 * sequenceMapWidth)
        .attr('height', "25%") // radius
        .style('fill', function (d) {
            return "black"
        }) // color of point


    function drawPoints() {
        // Draws points based on data provided by python
        // newData = []
        // for (var i = 0; i < data.length; ++i) {
        //     if (i % 10 == 0){
        //         newData.push(data[i])
        //     }    
        // }
        //data = newData

        points = points_g.selectAll("circle").data(data);
        points = points.enter().append("circle")
            .classed("dot", true) // class = .dot
            .classed("activePoint", true) // class = .dot
            .classed("plot", true) // class = .plot
            .attr('cx', function (d) {
                return xScale(Math.random() * 200 - 100)
            }) // x
            .attr('cy', function (d) {
                return yScale(Math.random() * 200 - 100)
            }) // y
            .attr('r', 12) // radius
            .attr('id', function (d) {
                return "p" + d.id
            }) // id
            .attr('start', function (d) {
                return d.start
            }) // starttime of point in given audiofile
            .style('fill', function (d) {
                return d.color
            }) // color of point
            .style('fill-opacity', 0.5) // a bit of transparency
            .style('stroke-width', floatingCircleRadius) // width of invisible radius, used to trigger hover
            .style('stroke-opacity', 0) // Hide frame of points 

        // Add functionality for map again, they were overridden during drawing of datapoints
        map.style("pointer-events", "all")
        map.call(zoom)
        map.on("dblclick.zoom", null) // turn off double click zoom
    }

    function drawRects() {
        // Draws rects based on data provided by python
        // newData = []
        // for (var i = 0; i < data.length; ++i) {
        //     if (i % 100 == 0){
        //         newData.push(data[i])
        //     }    
        // }
        //data = newData

        rects = rects_g.selectAll("rect").data(data);
        rects = rects.enter().append("rect")
            .classed("rectBar", true) // class = .plot
            .classed("activeRectBar", true) // class = .plot
            .attr('x', function (d) {
                //return xScale(d.tsneX)}
                return xScaleSequence((d.start / audioDuration) * 100)
            }) // x
            .attr("y", "0")
            .attr('width', (xScaleSequence(stepSize / audioDuration) * 100 - xScaleSequence(0))) // radius
            .attr('height', "100%") // radius
            .attr('id', function (d) {
                return "rect" + d.id
            }) // id
            .attr('start', function (d) {
                return d.start
            }) // starttime of point in given audiofile
            .style('fill', function (d) {
                return d.color
            }) // color of point
            .style('fill-opacity', 0.5) // a bit of transparency
            .style('cursor', "pointer")
            .on("click", function (d) {
                var audio = document.getElementById('audioBar');
                audio.currentTime = d.start / 1000;
                audio.play();
            })
            .on("mouseenter", function (d) {
                $("#timeBarDuration").show()
                $("#timeBarDuration").css({
                    'position': 'absolute',
                    'z-index': '-1000',
                    'background-color': "black",
                    'color': "white",
                    'left': d.start / audioDuration * 100 + '%'
                });
                $("#timeBarDuration").text(msToTime(d.start));
            })
            .on("mouseleave", function (d) {
                $("#timeBarDuration").hide()
            })


        // Add functionality for map again, they were overridden during drawing of datapoints
        sequenceMap.style("pointer-events", "all")
        sequenceMap.call(zoom2)
        sequenceMap.on("dblclick.zoom", null) // turn off double click zoom
    }

    function zoomed() {
        // create new scale ojects based on event
        new_xScale = d3.event.transform.rescaleX(xScale);
        new_yScale = d3.event.transform.rescaleY(yScale);
        points.data(data)
            .attr('cx', function (d) {
                if (alg == "tsne") {
                    return new_xScale(d.tsneX)
                } else if (alg == "pca") {
                    return new_xScale(d.pcaX)
                } else if (alg == "som") {
                    return new_xScale(d.somX)
                } else if (alg == "ae") {
                    return new_xScale(d.aeX)
                } else if (alg == "umap") {
                    return new_xScale(d.umapX)
                }
            })
            .attr('cy', function (d) {
                if (alg == "tsne") {
                    return new_yScale(d.tsneY)
                } else if (alg == "pca") {
                    return new_yScale(d.pcaY)
                } else if (alg == "som") {
                    return new_yScale(d.somY)
                } else if (alg == "ae") {
                    return new_yScale(d.aeY)
                } else if (alg == "umap") {
                    return new_yScale(d.umapY)
                }
            });
        d3.selectAll(".centroid").remove()
    }

    function zoomed2() {
        // create new scale ojects based on event
        new_xScaleSequence = d3.event.transform.rescaleX(xScaleSequence);

        rects.data(data)
            .attr('x', function (d) {
                return new_xScaleSequence((d.start / audioDuration) * 100)
            })
            .attr('width', function (d) {
                return (new_xScaleSequence((stepSize / audioDuration) * 100) - new_xScaleSequence(0))
            })
        timeBar
            .attr('x', function (d) {
                return new_xScaleSequence(((1000 * currentClosestTime) / audioDuration) * 100)
            })
    }


    //////////////////
    // Mouse events // 
    //////////////////

    map.on("mousemove", function (ev) {
        var coords = d3.mouse(this);
        if (shiftDown) {
            categorize(coords[0], coords[1]);
        } else if (ctrlDown) {
            updateAudioList(coords[0], coords[1]);
        }
    })

    sequenceMap.on("mousemove", function (ev) {
        var coords = d3.mouse(this);
        if (shiftDown) {
            categorizeFromTimeBar(coords[0], coords[1]);
        }
    })

    $(".plot").mousemove(function (ev) {
        drawFloatingCircle(ev);
    });

    $(".plot").mouseenter(function () {
        $('#floatingCircle').css({
            'visibility': '' + 'visible'
        });
    });

    $(".plot").mouseleave(function () {
        $('#floatingCircle').css({
            'visibility': '' + 'hidden'
        });
    });


    ////////////////
    // Key events // 
    ////////////////

    $(document).keydown(function (ev) {
        if (ev.shiftKey) {
            shiftDown = true;
            $("#startText").hide()
            $("#coloringText").show()
            $("#coloringMode").attr("stroke", categoryColor)
            $("#coloringMode").show()
        } else if (ev.ctrlKey) {
            ctrlDown = true;
            $("#startText").hide()
            $("#listeningText").show()
            $("#listeningMode").show()
        } else if (ev.keyCode == 67 && categoryColor != "black") {
            cDown = true;
            floatingCircleRadius = 65;
            drawFloatingCircle(ev);
        } else {
            if (ev.keyCode == 48) {
                categoryColor = "black";
            } else if (ev.keyCode == 49) {
                categoryColor = "blue";
            } else if (ev.keyCode == 50) {
                categoryColor = "green";
            } else if (ev.keyCode == 51) {
                categoryColor = "yellow";
            } else if (ev.keyCode == 52) {
                categoryColor = "red";
            } else if (ev.keyCode == 53) {
                categoryColor = "purple";
            } else if (ev.keyCode == 54) {
                categoryColor = "orange";
            } else if (ev.keyCode == 55) {
                categoryColor = "teal";
            } else if (ev.keyCode == 56) {
                categoryColor = "brown";
            } else if (ev.keyCode == 81) {
                $("#buttonGroup3 button").removeClass("btn-dark")
                $("#buttonGroup3 button").addClass("btn-dark")
                $("#buttonSize50").removeClass("btn-dark")
                $("#buttonSize50").addClass("btn-success")
                floatingCircleRadius = 50;
                prevFloatingCircleRadius = 50;
            } else if (ev.keyCode == 87) {
                $("#buttonGroup3 button").removeClass("btn-dark")
                $("#buttonGroup3 button").addClass("btn-dark")
                $("#buttonSize100").removeClass("btn-dark")
                $("#buttonSize100").addClass("btn-success")
                floatingCircleRadius = 100;
                prevFloatingCircleRadius = 100;
            } else if (ev.keyCode == 69) {
                $("#buttonGroup3 button").removeClass("btn-dark")
                $("#buttonGroup3 button").addClass("btn-dark")
                $("#buttonSize150").removeClass("btn-dark")
                $("#buttonSize150").addClass("btn-success")
                floatingCircleRadius = 150;
                prevFloatingCircleRadius = 150;
            } else if (ev.keyCode == 82) {
                $("#buttonGroup3 button").removeClass("btn-dark")
                $("#buttonGroup3 button").addClass("btn-dark")
                $("#buttonSize300").removeClass("btn-dark")
                $("#buttonSize300").addClass("btn-success")
                floatingCircleRadius = 300;
                prevFloatingCircleRadius = 300;
            }
            drawFloatingCircle(ev);
        }
    });

    $(document).keyup(function (ev) {
        if (shiftDown) {
            shiftDown = false;
            $("#coloringText").hide()
            $("#coloringMode").hide()
        } else if (ctrlDown) {
            stopSounds();
            ctrlDown = false;
            $("#listeningText").hide()
            $("#listeningMode").hide()
            currentSegmentStartTimes = [];
        } else if (cDown) {
            cDown = false;
            floatingCircleRadius = prevFloatingCircleRadius;
            drawFloatingCircle(ev);
        }
    });


    ////////////
    // Clicks // 
    ////////////

    map.on("click", function () {
        var coords = d3.mouse(this);
        if (cDown) {
            addCentroid(coords[0], coords[1]);
        } else {
            categorize(coords[0], coords[1]);
        }
    })

    // Change size of floating circle
    $(".buttonGroup1 button").on("click", function () {
        value = this.value;
        categoryColor = value;
    });

    $(".lockButton button").on("click", function () {
        if (this.value == "unlocked") {
            $("i", this).removeClass("fa-unlock");
            $("i", this).addClass('fa-lock')
            this.value = "locked"

            var col = $(this).attr("color")
            allPoints = d3.selectAll(".dot")
                .filter(function (d) {
                    return d3.select(this).style("fill") == col
                })
            allPoints.classed("activePoint", false);
            allPoints.style("fill-opacity", 0.1);

            rectBars = d3.selectAll(".rectBar")
                .filter(function (d) {
                    return d3.select(this).style("fill") == col
                })
            rectBars.classed("activeRectBar", false);
        } else if (this.value == "locked") {
            $("i", this).removeClass("fa-lock");
            $("i", this).addClass('fa-unlock')
            this.value = "unlocked"

            var col = $(this).attr("color")
            allPoints = d3.selectAll(".dot")
                .filter(function (d) {
                    return d3.select(this).style("fill") == col
                })
            allPoints.classed("activePoint", true);
            allPoints.style("fill-opacity", 0.5);

            rectsBars = d3.selectAll(".rectBar")
                .filter(function (d) {
                    return d3.select(this).style("fill") == col
                })
            rectBars.classed("activeRectBar", true);

        }
    });

    $(".colorAudioButton button").on("click", function () {
        if (this.value == "silent") {
            stopSounds()
            this.value = "playing"
            $(".categoryPlay").removeClass("fa-stop");
            $(".categoryPlay").addClass("fa-play");
            $("i", this).removeClass("fa-play");
            $("i", this).addClass('fa-stop')
            currentSegmentStartTimes = []
            var col = $(this).attr("color")
            console.log(col)
            coloredPoints = d3.selectAll(".dot")
                .filter(function (d) {
                    return d3.select(this).style("fill") == col
                })

            coloredPoints.each(function (d, i) {
                currentSegmentStartTimes.push(d3.select(this).attr("start"));
            })
        } else {
            stopSounds()
            this.value = "silent"
            $("i", this).removeClass("fa-stop");
            $("i", this).addClass('fa-play')
        }


    });


    // Change algorithm, and therefor coords
    $(".buttonGroup2 button").on("click", function () {
        $(".buttonGroup2 button").removeClass("btn-dark")
        $(".buttonGroup2 button").addClass("btn-dark")
        $(this).removeClass("btn-dark")
        $(this).addClass("btn-success")
        alg = this.value;
        changeAlgorithm();
    });

    $("#buttonGroup3 button").on("click", function () {
        $("#buttonGroup3 button").removeClass("btn-dark")
        $("#buttonGroup3 button").addClass("btn-dark")
        $(this).removeClass("btn-dark")
        $(this).addClass("btn-success")
        floatingCircleRadius = this.value;
    });

    $("#buttonGroup4 button").on("click", function () {
        arrayToCSV();
    });

    $("#buttonGroup5 button").on("click", function () {
        retrain();
    });

    $("#buttonGroup6 button").on("click", function () {
        $("#buttonGroup6 button").removeClass("btn-dark")
        $("#buttonGroup6 button").addClass("btn-dark")
        $(this).removeClass("btn-dark")
        $(this).addClass("btn-success")
        stopSounds()
        if (this.value == "stop") {
            var audio = document.getElementById('audioBar');
            audio.pause();
            audio.currentTime = 0;
        } else {
            $("#audioBar").trigger(this.value);
        }

    });

    $("#buttonGroup7 button").on("click", function () {
        console.log(categoryColor)
        d3.selectAll(".dot")
            .style('fill', categoryColor)
        d3.selectAll(".rectBar")
            .style('fill', categoryColor)

    });

    $("#buttonGroup8 button").on("click", function () {
        $("#buttonGroup8 button").removeClass("btn-dark")
        $("#buttonGroup8 button").addClass("btn-dark")
        $(this).removeClass("btn-dark")
        $(this).addClass("btn-success")

        sampling = parseInt(this.value);

        d3.selectAll(".dot")
            .classed("activePoint", true)
            .style("visibility", "visible")
            .each(function (d, i) {
                if (i % sampling != 0) {
                    d3.select(this).style("visibility", "hidden")
                    d3.select(this).classed("activePoint", false);
                }
            })

        d3.selectAll(".rectBar")
            .classed("activeRectBar", true)
            .style("visibility", "visible")
            .each(function (d, i) {
                if (i % sampling != 0) {
                    d3.select(this).style("visibility", "hidden")
                    d3.select(this).classed("activeRectBar", false);
                }
            })

    });

    $("#buttonGroup9 button").on("click", function () {
        colorWithKmeans(this.value);

    });

    $("#graphMap").on("click", function () {
        updateGraph();
    })


    /////////////////////
    // Misc. functions // 
    /////////////////////


    function categorize(x, y) {
        // Changes color of points and bars
        labeled = true;
        if (alg == "tsne") {
            circles = d3.selectAll(".activePoint")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.tsneX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.tsneY) - y) < floatingCircleRadius / 2
                })
            circles.style('fill', categoryColor)

            rectsBars = d3.selectAll(".activeRectBar")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.tsneX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.tsneY) - y) < floatingCircleRadius / 2
                })
            rectsBars.style('fill', categoryColor)
        } else if (alg == "pca") {
            circles = d3.selectAll(".activePoint")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.pcaX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.pcaY) - y) < floatingCircleRadius / 2
                })
            circles.style('fill', categoryColor)

            rectsBars = d3.selectAll(".activeRectBar")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.pcaX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.pcaY) - y) < floatingCircleRadius / 2
                })
            rectsBars.style('fill', categoryColor)
        } else if (alg == "som") {
            circles = d3.selectAll(".activePoint")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.somX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.somY) - y) < floatingCircleRadius / 2
                })
            circles.style('fill', categoryColor)

            rectsBars = d3.selectAll(".activeRectBar")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.somX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.somY) - y) < floatingCircleRadius / 2
                })
            rectsBars.style('fill', categoryColor)
        } else if (alg == "ae") {
            circles = d3.selectAll(".activePoint")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.aeX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.aeY) - y) < floatingCircleRadius / 2
                })
            circles.style('fill', categoryColor)

            rectsBars = d3.selectAll(".activeRectBar")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.aeX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.aeY) - y) < floatingCircleRadius / 2
                })
            rectsBars.style('fill', categoryColor)
        } else if (alg == "umap") {
            circles = d3.selectAll(".activePoint")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.umapX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.umapY) - y) < floatingCircleRadius / 2
                })
            circles.style('fill', categoryColor)

            rectsBars = d3.selectAll(".activeRectBar")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.umapX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.umapY) - y) < floatingCircleRadius / 2
                })
            rectsBars.style('fill', categoryColor)
        }
    }

    function categorizeFromTimeBar(x, y) {
        // Changes color of points and bars
        labeled = true;
        // rects = d3.select(".rect")
        console.log(x, y)
        // console.log(d3.select(rects).attr("start"))
        rectBars = d3.selectAll(".activeRectBar")
            .filter(function (d) {
                return Math.abs(new_xScaleSequence((d.start / audioDuration) * 100) - x) < floatingCircleRadius / 2
            })
        rectBars.style('fill', categoryColor)

        circles = d3.selectAll(".activePoint")
            .filter(function (d) {
                return Math.abs(new_xScaleSequence((d.start / audioDuration) * 100) - x) < floatingCircleRadius / 2
            })
        circles.style('fill', categoryColor)
    }

    function updateAudioList(x, y) {
        currentSegmentStartTimes = []
        if (alg == "tsne") {
            circles = d3.selectAll(".dot")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.tsneX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.tsneY) - y) < floatingCircleRadius / 2
                })
            circles.each(function (d, i) {
                currentSegmentStartTimes.push(d3.select(this).attr("start"));
            })
        } else if (alg == "pca") {
            circles = d3.selectAll(".dot")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.pcaX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.pcaY) - y) < floatingCircleRadius / 2
                })
            circles.each(function (d, i) {
                currentSegmentStartTimes.push(d3.select(this).attr("start"));
            })
        } else if (alg == "som") {
            circles = d3.selectAll(".dot")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.somX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.somY) - y) < floatingCircleRadius / 2
                })
            circles.each(function (d, i) {
                currentSegmentStartTimes.push(d3.select(this).attr("start"));
            })
        } else if (alg == "ae") {
            circles = d3.selectAll(".dot")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.aeX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.aeY) - y) < floatingCircleRadius / 2
                })
            circles.each(function (d, i) {
                currentSegmentStartTimes.push(d3.select(this).attr("start"));
            })
        } else if (alg == "umap") {
            circles = d3.selectAll(".dot")
                .filter(function (d) {
                    return Math.abs(new_xScale(d.umapX) - x) < floatingCircleRadius / 2 &
                        Math.abs(new_yScale(d.umapY) - y) < floatingCircleRadius / 2
                })
            circles.each(function (d, i) {
                currentSegmentStartTimes.push(d3.select(this).attr("start"));
            })
        }
    }

    function addCentroid(x, y) {
        centroids[categoryColor] = [x, y]
        d3.select("#" + categoryColor + "centroid").remove()
        points_g.append("circle")
            .classed("centroid", true)
            .attr("id", categoryColor + "centroid")
            .attr('x', x) // x
            .attr('y', y) // y
            .attr('cx', function (d) {
                return x
            }) // x
            .attr('cy', function (d) {
                return y
            }) // y
            .attr('r', 25) // radius
            .style('fill', function (d) {
                return categoryColor
            }) // color of point
            .style('stroke', "white")
            .style('stroke-width', "25")
            .style('stroke-opacity', "0.8")
            .style('fill-opacity', 1.0)
            .style('z-index', 1000)
        updateGraph(categoryColor, x, y)
    }

    function drawFloatingCircle(ev) {
        // Draws floating circle
        $('#floatingCircle').css({
            'left': '' + ev.pageX - (floatingCircleRadius / 2) + 'px',
            'top': '' + ev.pageY - (floatingCircleRadius / 2) + 'px',
            'width': '' + floatingCircleRadius + 'px',
            'height': '' + floatingCircleRadius + 'px',
            'background-color': categoryColor,
            'background-image': 'radial-gradient(circle, ' + categoryColor + ' ' + (gradient - 30) + '%, white 100%)'
        });
    }

    function changeAlgorithm() {
        var circle = map.selectAll(".dot");
        circle.transition()
            .duration(3000)
            .attr('cx', function (d) {
                if (alg == "tsne") {
                    return new_xScale(d.tsneX)
                } else if (alg == "pca") {
                    return new_xScale(d.pcaX)
                } else if (alg == "som") {
                    return new_xScale(d.somX)
                } else if (alg == "ae") {
                    return new_xScale(d.aeX)
                } else if (alg == "umap") {
                    return new_xScale(d.umapX)
                }
            })
            .attr('cy', function (d) {
                if (alg == "tsne") {
                    return new_yScale(d.tsneY)
                } else if (alg == "pca") {
                    return new_yScale(d.pcaY)
                } else if (alg == "som") {
                    return new_yScale(d.somY)
                } else if (alg == "ae") {
                    return new_yScale(d.aeY)
                } else if (alg == "umap") {
                    return new_yScale(d.umapY)
                }
            })
    }

    function colorWithKmeans(clusterValue) {
        console.log("Kmean coloring")
        points.data(data)
            .style('fill', function (d) {
                if (clusterValue == "kcolor2") {
                    return d.kcolor2
                } else if (clusterValue == "kcolor3") {
                    return d.kcolor3
                } else if (clusterValue == "kcolor4") {
                    return d.kcolor4
                } else if (clusterValue == "kcolor5") {
                    return d.kcolor5
                } else if (clusterValue == "kcolor6") {
                    return d.kcolor6
                } else if (clusterValue == "kcolor7") {
                    return d.kcolor7
                } else if (clusterValue == "kcolor8") {
                    return d.kcolor8
                } else if (clusterValue == "kcolor20") {
                    return d.kcolor20
                } else if (clusterValue == "dbcolor") {
                    return d.dbcolor
                }
            })
        rects.data(data)
            .style('fill', function (d) {
                if (clusterValue == "kcolor2") {
                    return d.kcolor2
                } else if (clusterValue == "kcolor3") {
                    return d.kcolor3
                } else if (clusterValue == "kcolor4") {
                    return d.kcolor4
                } else if (clusterValue == "kcolor5") {
                    return d.kcolor5
                } else if (clusterValue == "kcolor6") {
                    return d.kcolor6
                } else if (clusterValue == "kcolor7") {
                    return d.kcolor7
                } else if (clusterValue == "kcolor8") {
                    return d.kcolor8
                } else if (clusterValue == "kcolor20") {
                    return d.kcolor20
                } else if (clusterValue == "dbcolor") {
                    return d.dbcolor
                }
            })

    }


    function downloadString(text, fileType, fileName) {
        var blob = new Blob([text], {
            type: fileType
        });
        var a = document.createElement('a');
        a.download = fileName;
        a.href = URL.createObjectURL(blob);
        a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
        }, 1500);
    }

    function arrayToCSV() {
        if (!labeled) {
            alert("Can't export, there are no labels")


        } else {
            twoDiArray = [
                ["id", "startTime(ms)", "label", "color", "tsneX", "tsneY", "umapX", "umapY", "somX", "somY"]
            ]

            for (var i = 0; i < data.length; ++i) {
                currentId = "#p" + data[i]["id"]
                currentSt = data[i]["start"]
                currentPoint = d3.select(currentId)
                if (currentPoint.empty()) {
                    currentColor = "black"
                    currentLabel = "none"
                } else {
                    currentColor = currentPoint.style("fill")
                    if (currentColor == "black") {
                        currentLabel = "none"
                    } else {
                        currentLabel = $("#" + currentColor + "Label").val()
                    }
                }
                currentTsneX = data[i]["tsneX"]
                currentTsneY = data[i]["tsneY"]
                currentUmapX = data[i]["umapX"]
                currentUmapY = data[i]["umapY"]
                currentSomX = data[i]["somX"]
                currentSomY = data[i]["somY"]
                twoDiArray.push([currentId, currentSt, currentLabel, currentColor, currentTsneX, currentTsneY, currentUmapX, currentUmapY, currentSomX, currentSomY])

            }

            var csvRows = [];
            for (var i = 0; i < twoDiArray.length; ++i) {
                //console.log(twoDiArray[i])
                csvRows.push(twoDiArray[i].join(','));
            }

            var csvString = csvRows.join('\r\n');
            downloadString(csvString, "text", "labels.txt")
        }
    }

    function updateGraph(color, centroidX, centroidY) {
        // Loop through points and calculate distances from centroid
        X = [];
        Y = [];
        $(".dot").each(function () {
            p = d3.select("#" + $(this).attr('id'))
            X.push((p.attr('start') / audioDuration) * graphMapWidth)

            dist = Math.sqrt(
                (centroidX - p.attr('cx')) * (centroidX - p.attr('cx')) +
                (centroidY - p.attr('cy')) * (centroidY - p.attr('cy')));
            Y.push(dist)
        })

        // Transform distribution to 0-1
        YMax = Math.max.apply(Math, Y)
        for (var i = 0; i < Y.length; i++) {
            Y[i] /= YMax;
        }

        // Convert to proper string format
        pointsAsString = ""
        Y = medianFilter(Y, $("#medianfilterValue").val())
        Y[0] = 100
        Y[Y.length - 1] = 100
        for (var i2 = 0; i2 < X.length; i2++) {
            pointsAsString += X[i2]
            pointsAsString += "," + Y[i2] * graphMapHeight + " "
        }

        // Remove potential existing line of same color 
        d3.select("#polyline" + color).remove()

        // Create line
        graphMap.append("polyline")
            .attr("id", "polyline" + color)
            .attr("stroke", color)
            .attr("stroke-width", 3)
            .attr("fill", color)
            .attr("fill-opacity", 0.5)
            .attr("points", pointsAsString)
    }

    function medianFilter(array, windowSize) {
        newArray = []
        for (var i = 0; i < array.length; i++) {
            currentValues = [array[i]]
            var i2 = 1
            while (i2 <= windowSize) {
                currentValues.push(array[i + i2])
                currentValues.push(array[i - i2])
                i2++;
            }
            newArray.push(median(currentValues))
        }
        return newArray
    }

    function median(values) {
        values.sort(function (a, b) {
            return a - b;
        });

        if (values.length === 0) return 0

        var half = Math.floor(values.length / 2);

        if (values.length % 2) {
            return values[half];
        } else {
            return (values[half - 1] + values[half]) / 2.0;
        }

    }

    function retrain() {
        if (!labeled) {
            alert("Can't retrain, there are no labels")
        } else {
            $("#loadText").show();
            d3.selectAll("circle")
                .style("display", "none");
            validPoints = [
                ["id", "startTime(ms)", "label"]
            ]

            $(".dot").each(function (i) {
                p = d3.select("#" + $(this).attr('id'))
                //label = $("#"+p.style("fill")+"Label").val()
                if (p.style("fill") != 'black') {
                    validPoints.push([p.attr('start') / stepSize, p.attr('start'), p.style("fill")])
                }
            })

            myData = {
                "validPoints": JSON.stringify(validPoints),
                "sessionKey": sessionKey,
                "audioPath": audioPath,
                "segmentSize": segmentSize,
                "stepSize": stepSize
            }

            $.ajax({
                type: "POST",
                url: "/retrain",
                data: myData,
                dataType: "json",
                success: function (data, textStatus) {
                    if (data.redirect) {
                        // data.redirect contains the string URL to redirect to
                        window.location.href = data.redirect;
                    } else {
                        console.log("Check ajax request, went to else-statement there");
                    }
                }
            });
        }
    }


    ///////////////
    // Web audio // 
    ///////////////


    var audioCtx = new AudioContext();
    var audioBuffers;
    var audioLoaded = false;
    var currentSegmentStartTimes = [];
    var activeSounds = [];
    console.log(audioPath)
    console.log(audioPaths)
    loadAudio(audioPaths);


    var launchInterval = segmentSize / 5;
    $("#launchSlider").val(launchInterval);
    $("#launchSliderText").text("Interval: " + launchInterval);

    var fade = segmentSize / 4;
    $("#fadeSlider").val(fade);
    $("#fadeSliderText").text("Fade in/out: " + fade);

    var gradient = 50;
    $("#gradientSlider").val(gradient);
    $("#gradientSliderText").text("Gradient: " + gradient);

    $("#launchSlider").on("mousemove", function () {
        launchInterval = this.value;
        $("#launchSliderText").text("Interval: " + launchInterval);
    })

    $("#fadeSlider").on("mousemove", function () {
        fade = this.value;
        $("#fadeSliderText").text("Fade in/out: " + fade);
    })

    $("#gradientSlider").on("mousemove", function () {
        gradient = this.value;
        $("#gradientSliderText").text("Gradient: " + gradient);
    })

    function loadAudio(fileNames) {
        audioList = fileNames;
        bufferLoader = new BufferLoader(
            audioCtx,
            audioList,
            finishedLoading
        );
        bufferLoader.load();

        function finishedLoading(bufferList) {
            audioBuffers = bufferList;
            var audioLoaded = true;
            $("#loading-sm").hide()
            $("#loading-label").hide()
            console.log("Audio loaded.");
        }
    }

    // This function is called every 1000ms and samples and plays audio segments from
    // currentSegmentStartTimes according to launch-intervals and fade
    function playSegments() {
        if (currentSegmentStartTimes.length > 0) {
            var i;
            var startTime
            console.log(launchInterval);
            for (i = 0; i < 100; i++) {
                startTime = audioCtx.currentTime + (i * launchInterval) / 1000;
                var audioInterval = currentSegmentStartTimes[Math.floor(Math.random() * currentSegmentStartTimes.length)];
                var source = audioCtx.createBufferSource();


                if (audioBuffers.length == 1) {
                    bufferIndex = 0
                } else {
                    var bufferIndex = Math.floor(audioInterval / 3600000)
                    audioInterval = audioInterval - (3600000 * bufferIndex)
                }


                source.buffer = audioBuffers[bufferIndex];
                var volume = audioCtx.createGain();
                source.connect(volume);
                volume.connect(audioCtx.destination);

                volume.gain.value = 0.1;
                volume.gain.exponentialRampToValueAtTime(1.0, startTime + fade / 1000);
                volume.gain.setValueAtTime(1.0, startTime + (segmentSize - fade) / 1000);
                volume.gain.exponentialRampToValueAtTime(0.1, startTime + segmentSize / 1000);

                if (i * launchInterval >= 1000) {
                    break;
                }
                source.start(startTime, audioInterval / 1000, segmentSize / 1000);
                activeSounds.push(source)
                console.log(audioInterval + " starting in: " + startTime);
            }
        }
    }

    function stopSounds() {
        console.log("killing sound")
        for (var i = 0; i < activeSounds.length; ++i) {
            activeSounds[i].stop()
        }
        activeSounds = []
        currentSegmentStartTimes = []
    }

    function updateTimeBar() {
        var audio = document.getElementById('audioBar');
        timeBar.attr("x", new_xScaleSequence(((1000 * (audio.currentTime.toFixed(2)) - 1000) / audioDuration) * 100))
    }

    // Sample audio from points every second
    setInterval(playSegments, 1000);
    setInterval(updateTimeBar, stepSize);


})

// Outside document.ready as it is used in html code
function msToTime(ms) {
    // Converts milliseconds to duration, min:sec:ms
    var hours = Math.floor((ms / (60 * 60 * 1000)) % 60).toString();
    var minutes = Math.floor((ms / (60 * 1000)) % 60).toString();
    var seconds = Math.floor((ms / 1000) % 60).toString();
    var milliseconds = (ms % 1000).toString();

    if (hours.length == 1) {
        hours = "0" + hours;
    }
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
    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}