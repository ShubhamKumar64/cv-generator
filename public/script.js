document.getElementById("cvForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    education: document.getElementById("education").value,
    skills: document.getElementById("skills").value,
    experience: document.getElementById("experience").value,
  };

  const res = await fetch("http://localhost:5000/api/save-cv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const msg = await res.text();
  alert(msg);

  // ✅ Clean & inject CV preview
  const preview = document.getElementById("cvPreview");
  preview.innerHTML = `
    <h3>${data.name}</h3>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone}</p>
    <p><strong>Education:</strong><br>${data.education.replace(/\n/g, "<br>")}</p>
    <p><strong>Skills:</strong><br>${data.skills.replace(/\n/g, "<br>")}</p>
    <p><strong>Experience:</strong><br>${data.experience.replace(/\n/g, "<br>")}</p>
  `;

  document.getElementById("downloadBtn").style.display = "inline-block";
});



document.getElementById("downloadBtn").addEventListener("click", () => {
  const cvElement = document.getElementById("cvPreview");

  html2canvas(cvElement).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("My_CV.pdf");
  });
});

