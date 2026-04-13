import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./ServiceFormPopup.css";
import Loader from "./Loader";

const ServiceFormPopup = () => {
  const [loading, setLoading] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [images, setImages] = useState([]);
  const [caseDetails, setCaseDetails] = useState({});
  const [timesheets, setTimesheets] = useState({});
  const [taskCompletion, setTaskCompletion] = useState([]);
  const [taskParts, setTaskParts] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [memo, setMemo] = useState("");

  // filtering tasks
  const [filterType, setFilterType] = useState("all");

  const videoRef = useRef(null);
  const signaturePad1Ref = useRef(null);
  const signaturePad2Ref = useRef(null);

  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);

  const caseNumber = urlParams.get("caseNumber");
  const userId = urlParams.get("userId");

  const timesheetLabels = [
    "Departed for Site",
    "Arrived Onsite",
    "Work Paused",
    "Resume work",
    "Work Completed",
  ];

  const [enabledTimesheets, setEnabledTimesheets] = useState({
    "Departed for Site": true,
    "Arrived Onsite": false,
    "Work Paused": false,
    "Resume work": false,
    "Work Completed": false,
  });

  const isAllTasksCompleted =
    taskCompletion.length > 0 &&
    taskCompletion.every((t) => t.taskCompleted);

  const filteredTasks =
    filterType === "all"
      ? taskCompletion
      : taskCompletion.filter(
          (t) =>
            t.serviceSubGrp?.toLowerCase() ===
            filterType.toLowerCase()
        );

  useEffect(() => {
    setEnabledTimesheets((prev) => ({
      ...prev,
      "Work Completed": isAllTasksCompleted && timesheets["Resume work"],
    }));
  }, [isAllTasksCompleted, timesheets]);

  useEffect(() => {
    if (Object.keys(timesheets).length === 0) return;

    if (timesheets["Work Completed"]) {
      const disabledAll = timesheetLabels.reduce((acc, lbl) => {
        acc[lbl] = false;
        return acc;
      }, {});
      setEnabledTimesheets(disabledAll);
      return;
    }

    const newEnabled = {
      "Departed for Site": false,
      "Arrived Onsite": false,
      "Work Paused": false,
      "Resume work": false,
      "Work Completed": false,
    };

    if (!timesheets["Departed for Site"]) {
      newEnabled["Departed for Site"] = true;
    } else if (!timesheets["Arrived Onsite"]) {
      newEnabled["Arrived Onsite"] = true;
    } else {
      const pausedCount = Array.isArray(timesheets["Work Paused"])
        ? timesheets["Work Paused"].length
        : 0;
      const resumedCount = Array.isArray(timesheets["Resume work"])
        ? timesheets["Resume work"].length
        : 0;

      if (pausedCount === resumedCount) {
        newEnabled["Work Paused"] = true;
      } else {
        newEnabled["Resume work"] = true;
      }

      if (caseDetails.caseType === "Preventive") {
        if (isAllTasksCompleted && pausedCount === resumedCount) {
          newEnabled["Work Completed"] = true;
        }
      } else {
        newEnabled["Work Completed"] = true;
      }
    }

    setEnabledTimesheets(newEnabled);
  }, [timesheets, isAllTasksCompleted, caseDetails.caseType]);

  useEffect(() => {
    if (caseNumber && userId) {
      fetchDetails(caseNumber, userId);
    }
  }, [caseNumber, userId]);

  const fetchDetails = async (caseNumber, username) => {
    setLoading(true);
    try {
      const url = `https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5457&deploy=1&compid=7849230&ns-at=AAEJ7tMQQOlA8RVXNbv39719DUxVi8Hob6HtiOnc6_Em-Zq1y-U&action=getCaseDetails&username=${encodeURIComponent(
        username
      )}&caseNumber=${encodeURIComponent(caseNumber)}`;

      const response = await fetch(url);
      const data = await response.json();

      setCaseDetails(data);
      setTimesheets(data.timesheets || {});
      setTaskCompletion(data.taskCompletionresults || []);
      setTaskParts(data.servicePartsresults || []);
    } catch (error) {
      alert("Failed to fetch case details.");
    } finally {
      setLoading(false);
    }
  };

  const logTime = async (label) => {
    const time = new Date().toLocaleString();

    setTimesheets((prev) => {
      if (label === "Work Paused" || label === "Resume work") {
        const existing = prev[label] || [];
        return { ...prev, [label]: [...existing, time] };
      }
      return { ...prev, [label]: time };
    });

    setLoading(true);

    try {
      await fetch(
        "https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5457&deploy=1&compid=7849230&ns-at=AAEJ7tMQQOlA8RVXNbv39719DUxVi8Hob6HtiOnc6_Em-Zq1y-U",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "uploadTimesheet",
            technicianTripId: caseDetails.technicianTripId,
            type: label,
            time: time,
          }),
        }
      );
    } catch (err) {
      console.error("Error logging time:", err);
    }

    setLoading(false);
  };

  const handleTimesheetClick = (label) => {
    if (!enabledTimesheets[label]) return;

    logTime(label);

    if (label === "Work Completed") {
      const disabledState = timesheetLabels.reduce((acc, lbl) => {
        acc[lbl] = false;
        return acc;
      }, {});
      setEnabledTimesheets(disabledState);
      return;
    }

    setEnabledTimesheets((prev) => {
      const newState = { ...prev };

      switch (label) {
        case "Departed for Site":
          newState["Departed for Site"] = false;
          newState["Arrived Onsite"] = true;
          break;

        case "Arrived Onsite":
          newState["Arrived Onsite"] = false;
          newState["Work Paused"] = true;
          break;

        case "Work Paused":
          newState["Work Paused"] = false;
          newState["Resume work"] = true;
          break;

        case "Resume work":
          newState["Resume work"] = false;
          newState["Work Paused"] = true;
          if (isAllTasksCompleted) newState["Work Completed"] = true;
          break;
      }

      return newState;
    });
  };

  const handleCheckboxChange = (taskId, checked) => {
    if (!checked) return;
    if (!window.confirm("Are you sure you completed this task?")) return;

    setLoading(true);

    fetch(
      "https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5457&deploy=1&compid=7849230&ns-at=AAEJ7tMQQOlA8RVXNbv39719DUxVi8Hob6HtiOnc6_Em-Zq1y-U",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TASK_COMPLETED",
          recordId: taskId,
        }),
      }
    ).then(() => {
      setTaskCompletion((prev) =>
        prev.map((t) =>
          t.recordId === taskId ? { ...t, taskCompleted: true } : t
        )
      );
      setLoading(false);
    });
  };

  // CAMERA

  const startCamera = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    setVideoStream(mediaStream);
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      setVideoStream(null);
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/png");
    setImages((prev) => [...prev, imageData]);
  };

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // SIGNATURE PAD
  useEffect(() => {
    const setupCanvas = (ref) => {
      const canvas = ref.current;
      const ctx = canvas.getContext("2d");
      let drawing = false;

      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      const start = (e) => {
        drawing = true;
        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
      };

      const draw = (e) => {
        if (!drawing) return;
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      };

      const stop = () => (drawing = false);

      canvas.addEventListener("mousedown", start);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", stop);
      canvas.addEventListener("mouseleave", stop);

      return () => {
        canvas.removeEventListener("mousedown", start);
        canvas.removeEventListener("mousemove", draw);
        canvas.removeEventListener("mouseup", stop);
        canvas.removeEventListener("mouseleave", stop);
      };
    };

    const cleanup1 = setupCanvas(signaturePad1Ref);
    const cleanup2 = setupCanvas(signaturePad2Ref);

    return () => {
      cleanup1();
      cleanup2();
    };
  }, []);

  const clearSignature = (pad) => {
    const canvas =
      pad === 1 ? signaturePad1Ref.current : signaturePad2Ref.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // SUBMIT ------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!images.length) {
      alert("Please capture at least one image.");
      return setLoading(false);
    }

    const techSig = signaturePad1Ref.current.toDataURL();
    const supSig = signaturePad2Ref.current.toDataURL();

    const payload = {
      action: "submitCaseData",
      imagePayload: {
        caseNumber: caseDetails.caseNumber,
        images,
        signatures: {
          technician: techSig,
          supervisor: supSig,
        },
      },

      otherPayload: {
        caseId: caseDetails.caseId,
        technicianTripId: caseDetails.technicianTripId,
        taskCompletion: taskCompletion
          .filter((t) => t.taskCompleted)
          .map((t) => t.recordId),

        taskParts: (taskParts || [])
          .filter((p) => p) // safety remove null
          .map((p) => ({
            servicePartId: p.servicePartId,
            qtyUsed: p.qtyUsed,
            qtyReturned: p.qtyReturned,
          })),
      },

      timesheets,
    };

    try {
      const res = await fetch(
        "https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5457&deploy=1&compid=7849230&ns-at=AAEJ7tMQQOlA8RVXNbv39719DUxVi8Hob6HtiOnc6_Em-Zq1y-U",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();

      if (!result.success)
        throw new Error(result.error || "Submit failed");

      alert("Record saved successfully.");
      window.history.back();
    } catch (err) {
      alert("Submit failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // RENDER -------------------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div className="form-container">
        {loading && <Loader />}

        <button
          className="close-button"
          onClick={() => window.history.back()}
        >
          ×
        </button>

        <h1>Service Report Form</h1>

        <form onSubmit={handleSubmit}>
          {/* Case Details */}
          <div className="info-grid">
            <div className="info-item">
              Case Number <br />
              <strong>{caseDetails?.caseNumber ?? "Not Available"}</strong>
            </div>

            <div className="info-item">
              Equipment <br />
              <strong>
                {caseDetails?.equipment || caseDetails?.equipmentName || "Not Available"}
              </strong>
            </div>

            <div className="info-item">
              Subject <br />
              <strong>{caseDetails?.subject ?? "Not Available"}</strong>
            </div>

            <div className="info-item">
              Location <br />
              <strong>{caseDetails?.location ?? "Not Available"}</strong>
            </div>

            <div className="info-item">
              Subsidiary <br />
              <strong>
                {caseDetails?.equipmentSubsidiary || caseDetails?.subsidiary || "Not Available"}
              </strong>
            </div>

            <div className="info-item">
              Make/Model <br />
              <strong>{caseDetails?.makeModel ?? "Not Available"}</strong>
            </div>

            <div className="info-item">
              Schedule <br />
              <strong>{caseDetails?.schedule ?? "Not Available"}</strong>
            </div>

            <div className="info-item">
              Status <br />
              <strong>{caseDetails?.status ?? "Not Available"}</strong>
            </div>
          </div>

          <hr />

          {/* Timesheets */}
          <div className="form-group">
            <h5>Timesheets</h5>

            <div className="timesheet-buttons">
              {timesheetLabels.map((label) => {
                let bgColor = "gray";

                if (enabledTimesheets[label]) {
                  switch (label) {
                    case "Departed for Site":
                      bgColor = "blue";
                      break;
                    case "Arrived Onsite":
                      bgColor = "green";
                      break;
                    case "Work Paused":
                    case "Resume work":
                      bgColor = "orange";
                      break;
                    case "Work Completed":
                      bgColor = "red";
                      break;
                  }
                }

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleTimesheetClick(label)}
                    disabled={
                      !enabledTimesheets[label] ||
                      (label !== "Work Paused" &&
                        label !== "Resume work" &&
                        !!timesheets[label])
                    }
                    style={{
                      color: "white",
                      backgroundColor: bgColor,
                      marginRight: "8px",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div id="time-log">
              {timesheetLabels.map((label) => {
                const times = timesheets[label];
                if (!times) return null;

                if (Array.isArray(times)) {
                  return times.map((time, idx) => (
                    <div key={`${label}-${idx}`}>
                      <strong>{label}:</strong> {time}
                    </div>
                  ));
                }

                return (
                  <div key={label}>
                    <strong>{label}:</strong> {times}
                  </div>
                );
              })}
            </div>
          </div>

          <hr />

          {/* Task Completion */}
          {taskCompletion.length > 0 && (
            <div className="form-group">
              <h5>Task Completion</h5>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ marginLeft: "10px" }}>
                  Filter by Type:
                </label>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                </select>
              </div>

              <table className="task-completion-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Type</th>
                    <th style={{ textAlign: "center" }}>Completed</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTasks.map((t, i) => (
                    <tr key={i}>
                      <td>{t.serviceTask}</td>
                      <td>{t.serviceSubGrp}</td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={t.taskCompleted}
                          disabled={t.taskCompleted}
                          onChange={(e) =>
                            handleCheckboxChange(
                              t.recordId,
                              e.target.checked
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <hr />

          {/* ----------------------------------------- */}
          {/*          FIXED TASK PARTS SECTION         */}
          {/* ----------------------------------------- */}

          {taskParts && taskParts.length > 0 && (
            <div className="form-group">
              <h5>Task Parts</h5>

              <table className="task-parts-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Used</th>
                    <th>Returned</th>
                  </tr>
                </thead>

                <tbody>
                  {taskParts.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          type="checkbox"
                          checked={p.selected || false}
                          onChange={(e) => {
                            const updated = [...taskParts];
                            updated[i] = {
                              ...p,
                              selected: e.target.checked,
                            };
                            setTaskParts(updated);
                          }}
                        />
                      </td>

                      <td>
                        {p.displayName} ({p.servicePart})
                      </td>

                      <td>{p.quantity}</td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          max={p.quantity}
                          value={p.qtyUsed ?? ""}
                          onChange={(e) => {
                            const used =
                              parseInt(e.target.value, 10) || 0;
                            if (used > p.quantity)
                              return alert(
                                "Used cannot exceed total quantity."
                              );

                            const updated = [...taskParts];
                            updated[i] = {
                              ...p,
                              qtyUsed: used,
                              qtyReturned: p.quantity - used,
                              selected: used > 0,
                            };
                            setTaskParts(updated);
                          }}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={p.qtyReturned ?? ""}
                          readOnly
                          style={{ backgroundColor: "#f3f3f3" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <hr />

          {/* Photos */}
          <div className="form-group">
            <label>Take Photos:</label>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={startCamera}
                disabled={!!videoStream}
              >
                Open Camera
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                disabled={!videoStream}
              >
                Capture Photo
              </button>

              <button
                type="button"
                onClick={stopCamera}
                disabled={!videoStream}
              >
                Close Camera
              </button>
            </div>

            {videoStream && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "320px",
                  height: "240px",
                  border: "1px solid #ccc",
                  marginTop: "10px",
                }}
              />
            )}

            <div className="image-gallery" style={{ marginTop: "15px" }}>
              {images.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  width={160}
                  style={{ marginRight: "10px" }}
                />
              ))}
            </div>
          </div>

          <hr />

          {/* Signatures */}
          <div className="form-group">
            <label>Signatures:</label>

            <div className="signature-group">
              <div className="signature-box">
                <div className="signature-label">Technician</div>
                <canvas
                  ref={signaturePad1Ref}
                  className="signature-canvas"
                  width={400}
                  height={150}
                ></canvas>
                <button
                  type="button"
                  className="clear-signature"
                  onClick={() => clearSignature(1)}
                >
                  Clear Signature
                </button>
              </div>

              <div className="signature-box">
                <div className="signature-label">Supervisor</div>
                <canvas
                  ref={signaturePad2Ref}
                  className="signature-canvas"
                  width={400}
                  height={150}
                ></canvas>
                <button
                  type="button"
                  className="clear-signature"
                  onClick={() => clearSignature(2)}
                >
                  Clear Signature
                </button>
              </div>
            </div>
          </div>

          <hr />

          <button type="submit" disabled={loading}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default ServiceFormPopup;
