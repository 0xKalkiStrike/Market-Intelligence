import io
import json
import pandas as pd
from typing import List, Dict, Any, Optional


def clean_price(val: Any) -> Optional[float]:
    if val is None or pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).replace("$", "").replace(",", "").replace("€", "").replace("£", "").strip()
    try:
        return float(val_str)
    except (ValueError, TypeError):
        return None


def parse_excel_or_csv(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Parses an uploaded Excel (.xlsx, .xls) or CSV file into a list of standardized product dictionaries.
    """
    filename_lower = filename.lower()
    
    try:
        if filename_lower.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif filename_lower.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            try:
                df = pd.read_excel(io.BytesIO(file_bytes))
            except Exception:
                df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Could not read spreadsheet file '{filename}': {str(e)}")

    # Drop completely empty rows and clean column names
    df = df.dropna(how="all")
    df.columns = [str(col).strip() for col in df.columns]

    products_data = []

    for idx, row in df.iterrows():
        # Convert row to dictionary with clean keys
        row_dict = {str(k).strip(): (v if pd.notna(v) else None) for k, v in row.items()}
        
        # Helper to find value from potential column aliases with exact & tokenized matching
        def find_val(aliases: List[str], default: Any = None) -> Any:
            # 1. Exact match first
            for k, v in row_dict.items():
                k_norm = k.strip().lower()
                for alias in aliases:
                    if k_norm == alias.lower():
                        return v
            # 2. Tokenized word match
            for k, v in row_dict.items():
                k_tokens = k.lower().replace("_", " ").replace("-", " ").split()
                for alias in aliases:
                    alias_norm = alias.lower().replace("_", " ").replace("-", " ").strip()
                    if alias_norm in k_tokens or alias_norm in k.lower():
                        return v
            return default

        sku_val = find_val(["sku", "sku #", "product id", "product_id", "item id", "model", "mpn", "code", "part number", "id"])
        sku = str(sku_val).strip() if sku_val is not None else f"SKU-EXCEL-{idx + 1}"

        title_val = find_val(["title", "product name", "product_name", "name", "item name", "product title", "product", "item"])
        title = str(title_val).strip() if title_val is not None else f"Scraped Product #{idx + 1}"

        brand_val = find_val(["brand", "manufacturer", "make", "vendor"])
        brand = str(brand_val).strip() if brand_val is not None else "Generic"

        category_val = find_val(["category", "cat", "product type", "subcategory", "department", "type"])
        category = str(category_val).strip() if category_val is not None else "General"

        current_price = clean_price(find_val(["price", "current price", "base price", "original price", "cost", "msrp", "retail", "unit price", "price ($)"]))
        target_price = clean_price(find_val(["target price", "expected price", "target"]))

        gtin_val = find_val(["gtin", "upc", "ean", "barcode"])
        gtin = str(gtin_val).strip() if gtin_val is not None else None

        url_val = find_val(["url", "product url", "link", "target url", "source url", "web link"])
        url = str(url_val).strip() if url_val is not None else None

        image_val = find_val(["image", "image url", "photo", "thumbnail", "picture"])
        image_url = str(image_val).strip() if image_val is not None else None

        specs_raw = find_val(["specifications", "specs", "description", "details", "attributes", "features"])
        if isinstance(specs_raw, dict):
            specifications = json.dumps(specs_raw)
        elif specs_raw:
            specifications = str(specs_raw).strip()
        else:
            # Collect unused row attributes as JSON specs
            extra_specs = {k: str(v) for k, v in row_dict.items() if v is not None and len(str(v).strip()) > 0}
            specifications = json.dumps(extra_specs) if extra_specs else None

        products_data.append({
            "sku": sku,
            "title": title,
            "brand": brand,
            "category": category,
            "current_price": current_price,
            "target_price": target_price,
            "gtin": gtin,
            "url": url,
            "image_url": image_url,
            "specifications": specifications,
        })

    return products_data
